package com.sahaaye.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import androidx.compose.ui.graphics.Color
import com.sahaaye.data.model.NeedItem
import com.sahaaye.ui.theme.*

class NeedsDatabaseHelper(context: Context) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {
    companion object {
        private const val TAG = "NeedsDatabaseHelper"
        private const val DATABASE_NAME = "sahaaye_community.db"
        private const val DATABASE_VERSION = 1

        const val TABLE_NEEDS = "reported_needs"
        const val COL_ID = "id"
        const val COL_TITLE = "title"
        const val COL_DESCRIPTION = "description"
        const val COL_CATEGORY = "category"
        const val COL_EMOJI = "emoji"
        const val COL_LATITUDE = "latitude"
        const val COL_LONGITUDE = "longitude"
        const val COL_LOCATION = "location"
        const val COL_IMAGE_PATH = "image_path"
        const val COL_URGENCY = "urgency"
        const val COL_CREATED_AT = "created_at"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTableQuery = """
            CREATE TABLE $TABLE_NEEDS (
                $COL_ID TEXT PRIMARY KEY,
                $COL_TITLE TEXT NOT NULL,
                $COL_DESCRIPTION TEXT,
                $COL_CATEGORY TEXT NOT NULL,
                $COL_EMOJI TEXT NOT NULL,
                $COL_LATITUDE REAL NOT NULL,
                $COL_LONGITUDE REAL NOT NULL,
                $COL_LOCATION TEXT NOT NULL,
                $COL_IMAGE_PATH TEXT,
                $COL_URGENCY TEXT,
                $COL_CREATED_AT INTEGER NOT NULL
            )
        """.trimIndent()
        db.execSQL(createTableQuery)
        Log.i(TAG, "Created $TABLE_NEEDS table in SQLite database.")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_NEEDS")
        onCreate(db)
    }

    fun insertReportedNeed(need: NeedItem): Boolean {
        return try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put(COL_ID, need.id)
                put(COL_TITLE, need.title)
                put(COL_DESCRIPTION, need.description)
                put(COL_CATEGORY, need.category)
                put(COL_EMOJI, need.emoji)
                put(COL_LATITUDE, need.latitude)
                put(COL_LONGITUDE, need.longitude)
                put(COL_LOCATION, need.location)
                put(COL_IMAGE_PATH, need.imagePath)
                put(COL_URGENCY, need.urgency)
                put(COL_CREATED_AT, System.currentTimeMillis())
            }
            val rowId = db.insertWithOnConflict(TABLE_NEEDS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
            Log.i(TAG, "Successfully inserted reported need into database: ${need.title} (rowId: $rowId)")
            rowId != -1L
        } catch (e: Exception) {
            Log.e(TAG, "Error inserting need into database", e)
            false
        }
    }

    fun getAllReportedNeeds(): List<NeedItem> {
        val needsList = mutableListOf<NeedItem>()
        val db = readableDatabase
        val cursor = db.query(
            TABLE_NEEDS,
            null,
            null,
            null,
            null,
            null,
            "$COL_CREATED_AT DESC"
        )

        cursor.use { c ->
            val idIndex = c.getColumnIndexOrThrow(COL_ID)
            val titleIndex = c.getColumnIndexOrThrow(COL_TITLE)
            val descIndex = c.getColumnIndexOrThrow(COL_DESCRIPTION)
            val catIndex = c.getColumnIndexOrThrow(COL_CATEGORY)
            val emojiIndex = c.getColumnIndexOrThrow(COL_EMOJI)
            val latIndex = c.getColumnIndexOrThrow(COL_LATITUDE)
            val lngIndex = c.getColumnIndexOrThrow(COL_LONGITUDE)
            val locIndex = c.getColumnIndexOrThrow(COL_LOCATION)
            val imgIndex = c.getColumnIndexOrThrow(COL_IMAGE_PATH)
            val urgIndex = c.getColumnIndexOrThrow(COL_URGENCY)

            while (c.moveToNext()) {
                val cat = c.getString(catIndex)
                val color = when (cat.lowercase()) {
                    "food" -> BrandPrimary
                    "medical" -> AccentRose
                    "education" -> StatNearby
                    "shelter" -> StatProgress
                    "elderly" -> StatRating
                    else -> Color(0xFF64748B)
                }

                needsList.add(
                    NeedItem(
                        id = c.getString(idIndex),
                        title = c.getString(titleIndex),
                        location = c.getString(locIndex),
                        timeAgo = "Recently reported",
                        category = cat,
                        emoji = c.getString(emojiIndex),
                        latitude = c.getDouble(latIndex),
                        longitude = c.getDouble(lngIndex),
                        distanceKm = 0.0,
                        tagColor = color,
                        tagBg = color.copy(alpha = 0.15f),
                        description = c.getString(descIndex) ?: "",
                        imagePath = c.getString(imgIndex),
                        isUserReported = true,
                        urgency = c.getString(urgIndex) ?: "Normal"
                    )
                )
            }
        }
        return needsList
    }
}
