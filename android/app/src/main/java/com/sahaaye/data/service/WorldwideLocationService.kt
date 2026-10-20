package com.sahaaye.data.service

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.util.Log
import com.sahaaye.data.model.SahaayeLocation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale

object WorldwideLocationService {

    private const val TAG = "WorldwideLocService"

    /**
     * Search locations worldwide matching query (streets, galis, landmarks, cities, countries).
     * Uses Android's Google Play Services Geocoder first, falling back to Photon (OpenStreetMap).
     */
    suspend fun searchLocations(query: String, context: Context): List<SahaayeLocation> = withContext(Dispatchers.IO) {
        val cleanQuery = query.trim()
        if (cleanQuery.isBlank()) {
            return@withContext SahaayeLocation.SAMPLE_LOCATIONS
        }

        val results = mutableListOf<SahaayeLocation>()

        // 1. Try Android Native Geocoder (Backed by Google Play Services on real devices)
        try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocationName(cleanQuery, 10)
            if (!addresses.isNullOrEmpty()) {
                addresses.forEachIndexed { index, addr ->
                    val location = addressToSahaayeLocation(addr, index, cleanQuery)
                    if (location != null) {
                        results.add(location)
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Native Geocoder failed: ${e.message}")
        }

        // 2. Fallback to Photon (Worldwide OpenStreetMap geocoder API) if results are empty or few
        if (results.isEmpty()) {
            try {
                val photonResults = queryPhoton(cleanQuery)
                results.addAll(photonResults)
            } catch (e: Exception) {
                Log.w(TAG, "Photon fallback failed: ${e.message}")
            }
        }

        // 3. Fallback to local samples matching or dynamic synthesis if offline
        if (results.isEmpty()) {
            val localMatches = SahaayeLocation.SAMPLE_LOCATIONS.filter {
                it.name.contains(cleanQuery, ignoreCase = true) ||
                it.fullAddress.contains(cleanQuery, ignoreCase = true) ||
                it.locality.contains(cleanQuery, ignoreCase = true)
            }
            if (localMatches.isNotEmpty()) {
                results.addAll(localMatches)
            } else {
                // Synthesize dynamic search result
                results.add(
                    SahaayeLocation(
                        id = "search_${cleanQuery.hashCode()}",
                        name = cleanQuery,
                        fullAddress = "$cleanQuery, Madhya Pradesh, India",
                        locality = cleanQuery,
                        latitude = SahaayeLocation.DEFAULT.latitude + 0.005,
                        longitude = SahaayeLocation.DEFAULT.longitude + 0.005,
                        placeType = "Custom Search"
                    )
                )
            }
        }

        results.distinctBy { "${it.latitude},${it.longitude}" }
    }

    /**
     * Reverse geocode a latitude/longitude coordinate to a human-readable street/colony address.
     */
    suspend fun reverseGeocode(lat: Double, lng: Double, context: Context): SahaayeLocation = withContext(Dispatchers.IO) {
        // 1. Try Android Native Geocoder
        try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                val name = addr.featureName?.takeIf { it.isNotBlank() && it != addr.countryName }
                    ?: addr.subLocality
                    ?: addr.thoroughfare
                    ?: addr.locality
                    ?: "Pinned Location"

                val lines = (0..addr.maxAddressLineIndex).mapNotNull { addr.getAddressLine(it) }
                val fullAddress = if (lines.isNotEmpty()) {
                    lines.joinToString(", ")
                } else {
                    listOfNotNull(addr.thoroughfare, addr.subLocality, addr.locality, addr.adminArea, addr.postalCode, addr.countryName)
                        .joinToString(", ")
                }

                val locality = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea)
                    .distinct()
                    .joinToString(", ")
                    .ifBlank { addr.countryName ?: "Map Location" }

                return@withContext SahaayeLocation(
                    id = "pin_${lat}_${lng}",
                    name = name,
                    fullAddress = fullAddress,
                    locality = locality,
                    latitude = lat,
                    longitude = lng,
                    placeType = addr.thoroughfare ?: "Map Pin"
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Native Reverse Geocoder failed: ${e.message}")
        }

        // 2. Fallback to Nominatim Reverse Geocoding
        try {
            val nominatimLoc = queryNominatimReverse(lat, lng)
            if (nominatimLoc != null) {
                return@withContext nominatimLoc
            }
        } catch (e: Exception) {
            Log.w(TAG, "Nominatim Reverse failed: ${e.message}")
        }

        // 3. Fallback nearest sample location
        val nearest = SahaayeLocation.SAMPLE_LOCATIONS.minByOrNull {
            val dLat = it.latitude - lat
            val dLng = it.longitude - lng
            dLat * dLat + dLng * dLng
        }

        SahaayeLocation(
            id = "pin_${lat}_${lng}",
            name = nearest?.name ?: "Selected Location",
            fullAddress = "Near ${nearest?.fullAddress ?: "Coordinates: ${String.format(Locale.US, "%.4f, %.4f", lat, lng)}"}",
            locality = nearest?.locality ?: "Indore Area",
            latitude = lat,
            longitude = lng,
            placeType = "Map Pin"
        )
    }

    private fun addressToSahaayeLocation(addr: Address, index: Int, query: String): SahaayeLocation? {
        val name = addr.featureName?.takeIf { it.isNotBlank() && it != addr.countryName }
            ?: addr.subLocality
            ?: addr.thoroughfare
            ?: addr.locality
            ?: addr.adminArea
            ?: query

        val lines = (0..addr.maxAddressLineIndex).mapNotNull { addr.getAddressLine(it) }
        val fullAddress = if (lines.isNotEmpty()) {
            lines.joinToString(", ")
        } else {
            listOfNotNull(addr.featureName, addr.thoroughfare, addr.subLocality, addr.locality, addr.adminArea, addr.postalCode, addr.countryName)
                .distinct()
                .joinToString(", ")
        }

        val locality = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea)
            .distinct()
            .joinToString(", ")
            .ifBlank { addr.countryName ?: "City" }

        return SahaayeLocation(
            id = "geo_${addr.latitude}_${addr.longitude}_$index",
            name = name,
            fullAddress = fullAddress,
            locality = locality,
            latitude = addr.latitude,
            longitude = addr.longitude,
            placeType = addr.thoroughfare ?: "Place"
        )
    }

    private fun queryPhoton(query: String): List<SahaayeLocation> {
        val encoded = URLEncoder.encode(query, "UTF-8")
        val url = URL("https://photon.komoot.io/api/?q=$encoded&limit=8")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 4000
            readTimeout = 4000
            setRequestProperty("User-Agent", "SahaayeAndroidApp/1.0")
        }

        if (conn.responseCode != 200) return emptyList()

        val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
        val root = JSONObject(jsonStr)
        val features = root.optJSONArray("features") ?: return emptyList()

        val list = mutableListOf<SahaayeLocation>()
        for (i in 0 until features.length()) {
            val feat = features.optJSONObject(i) ?: continue
            val props = feat.optJSONObject("properties") ?: continue
            val geom = feat.optJSONObject("geometry") ?: continue
            val coords = geom.optJSONArray("coordinates") ?: continue
            val lng = coords.optDouble(0)
            val lat = coords.optDouble(1)

            val name = props.optString("name").takeIf { it.isNotBlank() }
                ?: props.optString("street").takeIf { it.isNotBlank() }
                ?: props.optString("city").takeIf { it.isNotBlank() }
                ?: query

            val street = props.optString("street")
            val city = props.optString("city").ifBlank { props.optString("district") }
            val state = props.optString("state")
            val country = props.optString("country")
            val postcode = props.optString("postcode")

            val fullAddr = listOf(name, street, city, state, postcode, country)
                .filter { it.isNotBlank() }
                .distinct()
                .joinToString(", ")

            val locality = listOf(city, state, country).filter { it.isNotBlank() }.distinct().joinToString(", ")

            list.add(
                SahaayeLocation(
                    id = "photon_${lat}_${lng}_$i",
                    name = name,
                    fullAddress = fullAddr,
                    locality = locality.ifBlank { country },
                    latitude = lat,
                    longitude = lng,
                    placeType = props.optString("type", "Locality")
                )
            )
        }
        return list
    }

    private fun queryNominatimReverse(lat: Double, lng: Double): SahaayeLocation? {
        val url = URL("https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lng&format=json")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 4000
            readTimeout = 4000
            setRequestProperty("User-Agent", "SahaayeAndroidApp/1.0")
        }

        if (conn.responseCode != 200) return null

        val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
        val root = JSONObject(jsonStr)
        val displayName = root.optString("display_name")
        val addr = root.optJSONObject("address")

        val name = root.optString("name").takeIf { it.isNotBlank() }
            ?: addr?.optString("road")?.takeIf { it.isNotBlank() }
            ?: addr?.optString("suburb")?.takeIf { it.isNotBlank() }
            ?: addr?.optString("city")?.takeIf { it.isNotBlank() }
            ?: "Pinned Location"

        val city = addr?.optString("city") ?: addr?.optString("town") ?: addr?.optString("village") ?: ""
        val state = addr?.optString("state") ?: ""
        val country = addr?.optString("country") ?: ""

        val locality = listOf(city, state, country).filter { it.isNotBlank() }.distinct().joinToString(", ")

        return SahaayeLocation(
            id = "nom_${lat}_${lng}",
            name = name,
            fullAddress = displayName.ifBlank { "$name, $locality" },
            locality = locality,
            latitude = lat,
            longitude = lng,
            placeType = root.optString("addresstype", "Map Pin")
        )
    }
}
