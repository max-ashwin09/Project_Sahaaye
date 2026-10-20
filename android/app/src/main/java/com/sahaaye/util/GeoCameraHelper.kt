package com.sahaaye.util

import android.content.Context
import android.graphics.*
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max

object GeoCameraHelper {

    private const val TAG = "GeoCameraHelper"

    /**
     * Stamped photo builder: Takes the captured JPEG file, rotates it according to EXIF,
     * and paints an official Geo-Camera watermark banner onto the bottom of the image.
     */
    suspend fun stampGeoDetailsOnImage(
        context: Context,
        rawImageFile: File,
        latitude: Double,
        longitude: Double,
        locationName: String
    ): File = withContext(Dispatchers.IO) {
        try {
            // 1. Decode raw bitmap with correct rotation from EXIF
            val exif = ExifInterface(rawImageFile.absolutePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )

            val rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }

            val originalBitmap = BitmapFactory.decodeFile(rawImageFile.absolutePath)
                ?: return@withContext rawImageFile

            val rotatedBitmap = if (rotationDegrees != 0f) {
                val matrix = Matrix().apply { postRotate(rotationDegrees) }
                val rotated = Bitmap.createBitmap(
                    originalBitmap,
                    0,
                    0,
                    originalBitmap.width,
                    originalBitmap.height,
                    matrix,
                    true
                )
                originalBitmap.recycle()
                rotated
            } else {
                originalBitmap
            }

            // 2. Create mutable bitmap to draw geo-stamp banner
            val width = rotatedBitmap.width
            val height = rotatedBitmap.height
            val stampedBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(stampedBitmap)
            canvas.drawBitmap(rotatedBitmap, 0f, 0f, null)

            // Banner height scaled dynamically to image resolution (approx 16-20% of image height)
            val bannerHeight = max(240f, height * 0.17f)
            val bannerTop = height - bannerHeight

            // Dark semi-transparent gradient/card background
            val bannerPaint = Paint().apply {
                shader = LinearGradient(
                    0f, bannerTop, 0f, height.toFloat(),
                    Color.argb(215, 10, 15, 30),
                    Color.argb(245, 5, 8, 20),
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(0f, bannerTop, width.toFloat(), height.toFloat(), bannerPaint)

            // Top accent border line on banner
            val accentPaint = Paint().apply {
                color = Color.parseColor("#2563EB") // Brand Primary
                strokeWidth = max(4f, width * 0.005f)
                style = Paint.Style.STROKE
            }
            canvas.drawLine(0f, bannerTop, width.toFloat(), bannerTop, accentPaint)

            // Dynamic scale factor based on width (normalized against 1080px)
            val scale = max(1.0f, width / 1080f)
            val paddingLeft = 32f * scale
            val baseTextSize = 26f * scale

            // 1. Watermark Badge Line (SAHAAYE GEO-VERIFIED NEED)
            val badgePaint = Paint().apply {
                color = Color.parseColor("#10B981") // Emerald Green
                textSize = baseTextSize * 1.05f
                isFakeBoldText = true
                isAntiAlias = true
            }
            val line1Y = bannerTop + (38f * scale)
            canvas.drawText("📍 SAHAAYE GEO-VERIFIED REPORT", paddingLeft, line1Y, badgePaint)

            // 2. Location & Address Line
            val addressPaint = Paint().apply {
                color = Color.WHITE
                textSize = baseTextSize * 1.15f
                isFakeBoldText = true
                isAntiAlias = true
            }
            val line2Y = line1Y + (34f * scale)
            val truncatedLocation = if (locationName.length > 55) {
                locationName.take(52) + "…"
            } else locationName
            canvas.drawText(truncatedLocation, paddingLeft, line2Y, addressPaint)

            // 3. Exact Coordinates Line (Lat, Lng)
            val coordPaint = Paint().apply {
                color = Color.parseColor("#93C5FD") // Light Blue
                textSize = baseTextSize * 0.92f
                isAntiAlias = true
            }
            val line3Y = line2Y + (30f * scale)
            val latFormatted = String.format(Locale.US, "%.6f° %s", Math.abs(latitude), if (latitude >= 0) "N" else "S")
            val lngFormatted = String.format(Locale.US, "%.6f° %s", Math.abs(longitude), if (longitude >= 0) "E" else "W")
            canvas.drawText("Lat: $latFormatted  •  Long: $lngFormatted", paddingLeft, line3Y, coordPaint)

            // 4. Date & Timestamp Line
            val timePaint = Paint().apply {
                color = Color.parseColor("#CBD5E1") // Slate 300
                textSize = baseTextSize * 0.85f
                isAntiAlias = true
            }
            val line4Y = line3Y + (28f * scale)
            val dateFormat = SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault())
            val dateStr = dateFormat.format(Date())
            canvas.drawText("Timestamp: $dateStr  •  GPS Locked", paddingLeft, line4Y, timePaint)

            // Save to output file
            val outputDir = File(context.cacheDir, "geo_reports").apply { mkdirs() }
            val outputFile = File(outputDir, "need_geo_${System.currentTimeMillis()}.jpg")
            FileOutputStream(outputFile).use { out ->
                stampedBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
            }

            // Cleanup
            rotatedBitmap.recycle()
            stampedBitmap.recycle()

            outputFile
        } catch (e: Exception) {
            Log.e(TAG, "Error stamping geo details on photo", e)
            rawImageFile
        }
    }
}
