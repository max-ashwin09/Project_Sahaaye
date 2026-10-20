package com.sahaaye.data.service

import android.util.Log
import com.sahaaye.data.model.NeedItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

data class ServerNeedResponse(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val urgency: String,
    val latitude: Double,
    val longitude: Double,
    val location: String,
    val imageUrl: String?,
    val status: String,
    val createdAt: String
)

object NeedsApiService {

    private const val TAG = "NeedsApiService"

    // Primary endpoint is 10.10.147.190:5001 for local network physical phone testing, 10.0.2.2:5001 for Emulator
    private const val WI_FI_HOST_URL = "http://10.10.147.190:5001/api/v1"
    private const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:5001/api/v1"
    private const val LOCALHOST_URL = "http://127.0.0.1:5001/api/v1"

    private var activeBaseUrl: String = WI_FI_HOST_URL

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    fun setBaseUrl(url: String) {
        activeBaseUrl = url.trimEnd('/')
    }

    fun getBaseUrl(): String = activeBaseUrl

    /**
     * Uploads a community reported need along with the geo-stamped photograph and actual GPS coordinates.
     * Hits the same server API endpoint used by the webapp (POST /api/v1/needs).
     */
    suspend fun uploadReportedNeed(
        photoFile: File,
        title: String,
        description: String,
        category: String,
        urgency: String,
        latitude: Double,
        longitude: Double,
        location: String,
        isMinorInvolved: Boolean = false
    ): Result<ServerNeedResponse> = withContext(Dispatchers.IO) {
        val urlsToAttempt = listOf(activeBaseUrl, LOCALHOST_URL).distinct()

        var lastException: Exception? = null

        for (baseUrl in urlsToAttempt) {
            try {
                val uploadUrl = "$baseUrl/needs"
                Log.i(TAG, "Attempting upload to: $uploadUrl (file: ${photoFile.name}, size: ${photoFile.length()} bytes)")

                val fileMediaType = "image/jpeg".toMediaTypeOrNull()
                val fileRequestBody = photoFile.asRequestBody(fileMediaType)

                val multipartBuilder = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("title", title)
                    .addFormDataPart("description", description)
                    .addFormDataPart("category", category)
                    .addFormDataPart("urgency", urgency)
                    .addFormDataPart("latitude", latitude.toString())
                    .addFormDataPart("longitude", longitude.toString())
                    .addFormDataPart("location", location)
                    .addFormDataPart("isMinorInvolved", isMinorInvolved.toString())
                    .addFormDataPart("photo", photoFile.name, fileRequestBody)

                val request = Request.Builder()
                    .url(uploadUrl)
                    .post(multipartBuilder.build())
                    .addHeader("Accept", "application/json")
                    .build()

                client.newCall(request).execute().use { response ->
                    val bodyString = response.body?.string() ?: ""

                    if (response.isSuccessful) {
                        Log.i(TAG, "Successfully uploaded need to server: $bodyString")
                        val json = JSONObject(bodyString)
                        val needJson = json.optJSONObject("need") ?: json

                        val serverNeed = ServerNeedResponse(
                            id = needJson.optString("id", "need_${System.currentTimeMillis()}"),
                            title = needJson.optString("title", title),
                            description = needJson.optString("description", description),
                            category = needJson.optString("category", category),
                            urgency = needJson.optString("urgency", urgency),
                            latitude = needJson.optDouble("latitude", latitude),
                            longitude = needJson.optDouble("longitude", longitude),
                            location = needJson.optString("location", location),
                            imageUrl = if (needJson.has("imageUrl") && !needJson.isNull("imageUrl")) needJson.getString("imageUrl") else null,
                            status = needJson.optString("status", "OPEN"),
                            createdAt = needJson.optString("createdAt", "")
                        )
                        return@withContext Result.success(serverNeed)
                    } else {
                        Log.w(TAG, "Server returned error: ${response.code} - $bodyString")
                        lastException = IOException("Server error ${response.code}: $bodyString")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed connection to $baseUrl: ${e.message}")
                lastException = e
            }
        }

        return@withContext Result.failure(lastException ?: IOException("Failed to reach server"))
    }

    /**
     * Fetch community needs from the server with optional distance filtering
     */
    suspend fun fetchServerNeeds(
        latitude: Double? = null,
        longitude: Double? = null,
        radiusKm: Double = 50.0
    ): Result<List<ServerNeedResponse>> = withContext(Dispatchers.IO) {
        try {
            val urlBuilder = "$activeBaseUrl/needs".toHttpUrl().newBuilder()



            if (latitude != null && longitude != null) {
                urlBuilder.addQueryParameter("lat", latitude.toString())
                urlBuilder.addQueryParameter("lng", longitude.toString())
                urlBuilder.addQueryParameter("radiusKm", radiusKm.toString())
            }

            val request = Request.Builder()
                .url(urlBuilder.build())
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Server error ${response.code}"))
                }

                val body = response.body?.string() ?: ""
                val json = JSONObject(body)
                val needsArray = json.optJSONArray("needs")

                val resultList = mutableListOf<ServerNeedResponse>()
                if (needsArray != null) {
                    for (i in 0 until needsArray.length()) {
                        val item = needsArray.getJSONObject(i)
                        resultList.add(
                            ServerNeedResponse(
                                id = item.optString("id"),
                                title = item.optString("title"),
                                description = item.optString("description"),
                                category = item.optString("category"),
                                urgency = item.optString("urgency"),
                                latitude = item.optDouble("latitude"),
                                longitude = item.optDouble("longitude"),
                                location = item.optString("location"),
                                imageUrl = if (item.has("imageUrl") && !item.isNull("imageUrl")) item.getString("imageUrl") else null,
                                status = item.optString("status", "OPEN"),
                                createdAt = item.optString("createdAt")
                            )
                        )
                    }
                }
                return@withContext Result.success(resultList)
            }
        } catch (e: Exception) {
            return@withContext Result.failure(e)
        }
    }
}
