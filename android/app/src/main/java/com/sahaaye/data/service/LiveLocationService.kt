package com.sahaaye.data.service

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.gms.tasks.Task
import com.sahaaye.data.model.SahaayeLocation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

object LiveLocationService {

    private const val TAG = "LiveLocationService"

    /**
     * Complete list of runtime permissions needed across the Sahaaye project:
     * - Location / GPS (for live distance, map matching, need discovery)
     * - Camera (for photo/video verification when reporting a need)
     * - Photos / Media / Files (for attaching documents and evidence)
     * - Notifications (for instant alerts when help is offered)
     */
    fun getRequiredPermissions(): Array<String> {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            @Suppress("DEPRECATION")
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        return permissions.toTypedArray()
    }

    /**
     * Check if all essential permissions are granted.
     */
    fun arePermissionsGranted(context: Context): Boolean {
        return getRequiredPermissions().all { perm ->
            ContextCompat.checkSelfPermission(context, perm) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Check specifically if Location (GPS) permission is granted.
     */
    fun hasLocationPermission(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Fetches the user's real live device GPS coordinates with high accuracy.
     * Reverses geocoding using WorldwideLocationService to resolve real street address.
     */
    @SuppressLint("MissingPermission")
    suspend fun fetchCurrentLiveLocation(context: Context): SahaayeLocation? = withContext(Dispatchers.IO) {
        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Location permission not granted.")
            return@withContext null
        }

        try {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            var rawLocation: Location? = null

            // 1. Try Google Play Services FusedLocationProvider with High Accuracy (Timeout 6 seconds)
            try {
                val cts = CancellationTokenSource()
                rawLocation = withTimeoutOrNull(6000L) {
                    fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token).awaitTask()
                }
            } catch (e: Exception) {
                Log.w(TAG, "getCurrentLocation failed: ${e.message}")
            }

            // 2. Fallback to fused client lastKnownLocation if fresh fix timed out
            if (rawLocation == null) {
                try {
                    rawLocation = fusedClient.lastLocation.awaitTask()
                } catch (e: Exception) {
                    Log.w(TAG, "lastLocation failed: ${e.message}")
                }
            }

            // 3. Fallback to Android Native LocationManager (GPS or Network)
            if (rawLocation == null) {
                val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                if (locManager != null) {
                    val gps = try { locManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) } catch (_: Exception) { null }
                    val net = try { locManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) } catch (_: Exception) { null }
                    rawLocation = gps ?: net
                }
            }

            if (rawLocation == null) {
                Log.w(TAG, "No GPS location could be fetched from any provider.")
                return@withContext null
            }

            Log.i(TAG, "Successfully fetched live device GPS coordinates: ${rawLocation.latitude}, ${rawLocation.longitude}")

            // 4. Reverse Geocode the real coordinates to get real street/city address
            val geocoded = WorldwideLocationService.reverseGeocode(
                lat = rawLocation.latitude,
                lng = rawLocation.longitude,
                context = context
            )

            // Return with accurate coordinates and place type
            geocoded.copy(
                latitude = rawLocation.latitude,
                longitude = rawLocation.longitude,
                placeType = "Live GPS Location"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching live location", e)
            null
        }
    }

    private suspend fun <T> Task<T>.awaitTask(): T? = suspendCancellableCoroutine { cont ->
        addOnSuccessListener { result ->
            if (cont.isActive) cont.resume(result)
        }
        addOnFailureListener {
            if (cont.isActive) cont.resume(null)
        }
        addOnCanceledListener {
            if (cont.isActive) cont.resume(null)
        }
    }
}
