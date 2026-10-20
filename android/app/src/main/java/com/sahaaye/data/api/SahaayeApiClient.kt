package com.sahaaye.data.api

import android.util.Log
import com.sahaaye.data.model.NeedItem
import com.sahaaye.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

object SahaayeApiClient {
    private const val TAG = "SahaayeApiClient"

    // Primary local development server IP (Mac host on local Wi-Fi)
    // and fallback emulator/localhost endpoints
    private const val HOST_IP = "10.10.147.190"
    private const val PORT = "5001"
    const val BASE_URL = "http://$HOST_IP:$PORT/api/v1"

    private val CANDIDATE_URLS = listOf(
        "http://10.0.2.2:$PORT/api/v1",
        "http://$HOST_IP:$PORT/api/v1",
        "http://127.0.0.1:$PORT/api/v1"
    )

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    /**
     * Upload a newly reported community need with geo-stamped photo to central backend.
     */
    suspend fun postNeedToBackend(need: NeedItem, imageFile: File? = null): Boolean {
        return withContext(Dispatchers.IO) {
            for (baseUrl in CANDIDATE_URLS) {
                try {
                    val multipartBuilder = MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("title", need.title)
                        .addFormDataPart("description", need.description ?: "")
                        .addFormDataPart("category", need.category)
                        .addFormDataPart("urgency", need.urgency ?: "Normal")
                        .addFormDataPart("latitude", need.latitude.toString())
                        .addFormDataPart("longitude", need.longitude.toString())
                        .addFormDataPart("location", need.location)

                    if (imageFile != null && imageFile.exists()) {
                        val mediaType = "image/jpeg".toMediaTypeOrNull()
                        val fileBody = imageFile.asRequestBody(mediaType)
                        multipartBuilder.addFormDataPart("photo", imageFile.name, fileBody)
                    }

                    val request = Request.Builder()
                        .url("$baseUrl/needs")
                        .post(multipartBuilder.build())
                        .build()

                    val response = client.newCall(request).execute()
                    val success = response.isSuccessful
                    Log.d(TAG, "postNeedToBackend response from $baseUrl: code=${response.code}, success=$success")
                    response.close()
                    if (success) return@withContext true
                } catch (e: Exception) {
                    Log.w(TAG, "Could not reach backend at $baseUrl (${e.message}).")
                }
            }
            Log.w(TAG, "All candidate backend URLs unreachable. Saved locally in SQLite.")
            false
        }
    }


    /**
     * Fetch community needs from central backend server with radius filtering.
     */
    suspend fun fetchNeedsFromBackend(lat: Double, lng: Double, radiusKm: Double = 50.0): List<NeedItem> {
        return withContext(Dispatchers.IO) {
            try {
                val url = "$BASE_URL/needs?lat=$lat&lng=$lng&radiusKm=$radiusKm"
                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    response.close()
                    return@withContext emptyList()
                }

                val bodyStr = response.body?.string() ?: ""
                response.close()

                if (bodyStr.isEmpty()) return@withContext emptyList()

                val json = JSONObject(bodyStr)
                val needsArray = json.optJSONArray("needs") ?: return@withContext emptyList()

                val result = mutableListOf<NeedItem>()
                for (i in 0 until needsArray.length()) {
                    val item = needsArray.getJSONObject(i)
                    val cat = item.optString("category", "Food")
                    val isFood = cat.contains("Food", ignoreCase = true)
                    val isMed = cat.contains("Med", ignoreCase = true)
                    val isEdu = cat.contains("Edu", ignoreCase = true)
                    val isElder = cat.contains("Elder", ignoreCase = true)

                    val emoji = when {
                        isFood -> "🍚"
                        isMed -> "💊"
                        isEdu -> "📚"
                        isElder -> "👴"
                        else -> "🤝"
                    }

                    val color = when {
                        isFood -> BrandPrimary
                        isMed -> AccentRose
                        isEdu -> StatNearby
                        else -> StatRating
                    }

                    val bg = when {
                        isFood -> BrandPrimaryLight
                        isMed -> AccentRoseBg
                        isEdu -> StatNearbyBg
                        else -> StatRatingBg
                    }

                    result.add(
                        NeedItem(
                            id = item.optString("id", "need_$i"),
                            title = item.optString("title", "Community Need"),
                            description = item.optString("description", ""),
                            category = cat,
                            urgency = item.optString("urgency", "Normal"),
                            location = item.optString("location", "Community"),
                            latitude = item.optDouble("latitude", lat),
                            longitude = item.optDouble("longitude", lng),
                            distanceKm = item.optDouble("distanceKm", 0.0),
                            timeAgo = "Live Server",
                            emoji = emoji,
                            tagColor = color,
                            tagBg = bg,
                            imagePath = if (item.isNull("imageUrl")) null else item.optString("imageUrl")
                        )
                    )
                }
                result
            } catch (e: Exception) {
                Log.w(TAG, "Backend sync offline or unreachable (${e.message}). Using local database.")
                emptyList()
            }
        }
    }
}
