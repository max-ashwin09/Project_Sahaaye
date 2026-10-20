package com.sahaaye.data.repository

import android.content.Context
import com.sahaaye.data.db.NeedsDatabaseHelper
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.QuickActionModel
import com.sahaaye.data.model.StatCardModel
import com.sahaaye.ui.theme.*
import androidx.compose.ui.graphics.Color
import kotlin.math.*

object NeedsRepository {

    private var dbHelper: NeedsDatabaseHelper? = null

    // Default reference location: Indore, MP (22.7196, 75.8577)
    const val INDORE_LAT = 22.7196
    const val INDORE_LNG = 75.8577

    val sampleStats = listOf(
        StatCardModel(
            id = "nearby",
            value = "28",
            label = "Nearby Needs",
            iconEmoji = "👥",
            trend = "+12%",
            color = StatNearby,
            bg = StatNearbyBg
        ),
        StatCardModel(
            id = "progress",
            value = "9",
            label = "In Progress",
            iconEmoji = "🔄",
            trend = "+5%",
            color = StatProgress,
            bg = StatProgressBg
        ),
        StatCardModel(
            id = "completed",
            value = "16",
            label = "Completed",
            iconEmoji = "✅",
            trend = "+26%",
            color = StatCompleted,
            bg = StatCompletedBg
        ),
        StatCardModel(
            id = "rating",
            value = "4.8",
            label = "Community Rating",
            iconEmoji = "⭐",
            trend = "+0.2",
            color = StatRating,
            bg = StatRatingBg
        )
    )

    val sampleNeeds = listOf(
        NeedItem(
            id = "n1",
            title = "Food Support for Family",
            location = "Vijay Nagar, Indore",
            timeAgo = "10 mins ago",
            category = "Food",
            emoji = "🍚",
            latitude = 22.7533,
            longitude = 75.8937,
            distanceKm = 1.2,
            tagColor = BrandPrimary,
            tagBg = BrandPrimaryLight,
            description = "Family of 4 needs basic ration assistance (flour, rice, pulses) for this week."
        ),
        NeedItem(
            id = "n2",
            title = "Medical Help Required",
            location = "Palasia, Indore",
            timeAgo = "25 mins ago",
            category = "Medical",
            emoji = "💊",
            latitude = 22.7244,
            longitude = 75.8839,
            distanceKm = 2.4,
            tagColor = AccentRose,
            tagBg = AccentRoseBg,
            description = "Urgent prescription medicines required for elderly patient with diabetes."
        ),
        NeedItem(
            id = "n3",
            title = "School Supplies Needed",
            location = "Scheme 54, Indore",
            timeAgo = "1 hour ago",
            category = "Education",
            emoji = "📚",
            latitude = 22.7570,
            longitude = 75.8880,
            distanceKm = 3.1,
            tagColor = StatNearby,
            tagBg = StatNearbyBg,
            description = "Notebooks, stationery, and backpacks needed for 12 underprivileged primary school students."
        ),
        NeedItem(
            id = "n4",
            title = "Elderly Care Support",
            location = "Annapurna Road, Indore",
            timeAgo = "2 hours ago",
            category = "Elderly",
            emoji = "👴",
            latitude = 22.6980,
            longitude = 75.8350,
            distanceKm = 3.8,
            tagColor = StatRating,
            tagBg = StatRatingBg,
            description = "Volunteer companionship and grocery delivery assistance needed for senior citizen living alone."
        ),
        NeedItem(
            id = "n5",
            title = "Blankets & Warm Clothes",
            location = "Rajwada, Indore",
            timeAgo = "3 hours ago",
            category = "Shelter",
            emoji = "🏠",
            latitude = 22.7196,
            longitude = 75.8577,
            distanceKm = 1.8,
            tagColor = StatProgress,
            tagBg = StatProgressBg,
            description = "Warm blankets and winter clothing needed for temporary shelter residents."
        ),
        NeedItem(
            id = "n6",
            title = "Emergency Blood Donor (O+)",
            location = "MY Hospital, Indore",
            timeAgo = "30 mins ago",
            category = "Medical",
            emoji = "🩸",
            latitude = 22.7160,
            longitude = 75.8750,
            distanceKm = 2.0,
            tagColor = AccentRose,
            tagBg = AccentRoseBg,
            description = "Urgent O+ blood donor needed for surgery patient at MY Hospital."
        )
    )

    val sampleQuickActions = listOf(
        QuickActionModel(
            id = "report",
            label = "Report a Need",
            subtitle = "Let the community know",
            iconEmoji = "➕",
            backgroundColor = Color(0xFFEFF6FF),
            iconBgColor = Color(0xFFDBEAFE)
        ),
        QuickActionModel(
            id = "nearby",
            label = "Find Nearby Needs",
            subtitle = "Explore around you",
            iconEmoji = "🗺️",
            backgroundColor = Color(0xFFF0FDF4),
            iconBgColor = Color(0xFFD1FAE5)
        ),
        QuickActionModel(
            id = "myreports",
            label = "My Reports",
            subtitle = "Track your submissions",
            iconEmoji = "📋",
            backgroundColor = Color(0xFFF5F3FF),
            iconBgColor = Color(0xFFEDE9FE)
        ),
        QuickActionModel(
            id = "activities",
            label = "My Helping Activities",
            subtitle = "See your impact",
            iconEmoji = "❤️",
            backgroundColor = Color(0xFFFFF1F2),
            iconBgColor = Color(0xFFFCE7F3)
        )
    )

    // List of user-submitted needs created via the Geo-Camera Report flow (persisted in SQLite)
    val userReportedNeeds = mutableListOf<NeedItem>()

    fun initDatabase(context: Context) {
        if (dbHelper == null) {
            dbHelper = NeedsDatabaseHelper(context.applicationContext)
            val savedNeeds = dbHelper?.getAllReportedNeeds() ?: emptyList()
            userReportedNeeds.clear()
            userReportedNeeds.addAll(savedNeeds)
        }
    }

    fun addReportedNeed(need: NeedItem, context: Context? = null) {
        if (context != null) {
            initDatabase(context)
        }
        userReportedNeeds.removeAll { it.id == need.id }
        userReportedNeeds.add(0, need)
        dbHelper?.insertReportedNeed(need)
    }

    // Calculate distance using Haversine formula
    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371.0 // Earth radius in km
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return (r * c * 10.0).roundToInt() / 10.0
    }

    /**
     * Dynamically generates and computes realistic community needs distributed
     * around any active center location anywhere in the world.
     */
    fun getNeedsForLocation(centerLat: Double, centerLng: Double, locationName: String = "Active Area"): List<NeedItem> {
        val cosLat = cos(Math.toRadians(centerLat)).coerceAtLeast(0.1)
        val kmToLat = 1.0 / 111.0
        val kmToLon = 1.0 / (111.0 * cosLat)

        val cleanLoc = locationName.split(",").firstOrNull()?.trim() ?: "Local"

        val templateNeeds = listOf(
            NeedItem(
                id = "need_loc_1",
                title = "Emergency Food Ration",
                location = "Near $cleanLoc Market",
                timeAgo = "12 mins ago",
                category = "Food",
                emoji = "🍚",
                latitude = centerLat + 0.45 * kmToLat,
                longitude = centerLng + 0.65 * kmToLon,
                distanceKm = 0.8,
                tagColor = BrandPrimary,
                tagBg = BrandPrimaryLight,
                description = "Daily-wage worker family needs basic rice, wheat flour and dal assistance."
            ),
            NeedItem(
                id = "need_loc_2",
                title = "Emergency Blood Donor (O+)",
                location = "Near $cleanLoc Hospital",
                timeAgo = "25 mins ago",
                category = "Medical",
                emoji = "🩸",
                latitude = centerLat - 0.95 * kmToLat,
                longitude = centerLng + 1.15 * kmToLon,
                distanceKm = 1.5,
                tagColor = AccentRose,
                tagBg = AccentRoseBg,
                description = "Urgent O+ blood donor needed for trauma patient."
            ),
            NeedItem(
                id = "need_loc_3",
                title = "Prescription Medicines Support",
                location = "Old Colony, $cleanLoc",
                timeAgo = "45 mins ago",
                category = "Medical",
                emoji = "💊",
                latitude = centerLat + 1.70 * kmToLat,
                longitude = centerLng - 1.65 * kmToLon,
                distanceKm = 2.4,
                tagColor = AccentRose,
                tagBg = AccentRoseBg,
                description = "Urgent asthma inhaler and diabetes medicines required for senior citizen."
            ),
            NeedItem(
                id = "need_loc_4",
                title = "School Books & Notebooks",
                location = "Govt School Road, $cleanLoc",
                timeAgo = "1 hour ago",
                category = "Education",
                emoji = "📚",
                latitude = centerLat - 2.25 * kmToLat,
                longitude = centerLng - 2.20 * kmToLon,
                distanceKm = 3.2,
                tagColor = StatNearby,
                tagBg = StatNearbyBg,
                description = "Stationery and backpacks needed for 15 underprivileged students."
            ),
            NeedItem(
                id = "need_loc_5",
                title = "Blankets & Warm Clothes",
                location = "Shelter Camp, $cleanLoc",
                timeAgo = "2 hours ago",
                category = "Shelter",
                emoji = "🏠",
                latitude = centerLat + 3.10 * kmToLat,
                longitude = centerLng + 3.25 * kmToLon,
                distanceKm = 4.5,
                tagColor = StatProgress,
                tagBg = StatProgressBg,
                description = "Winter blankets and sweaters needed for temporary shelter residents."
            ),
            NeedItem(
                id = "need_loc_6",
                title = "Elderly Care Companion",
                location = "Civil Lines, $cleanLoc",
                timeAgo = "3 hours ago",
                category = "Elderly",
                emoji = "👴",
                latitude = centerLat - 4.80 * kmToLat,
                longitude = centerLng + 4.75 * kmToLon,
                distanceKm = 6.8,
                tagColor = StatRating,
                tagBg = StatRatingBg,
                description = "Volunteer companionship and grocery delivery for an elderly couple."
            ),
            NeedItem(
                id = "need_loc_7",
                title = "Community Kitchen Meal Supplies",
                location = "Outer Sector, $cleanLoc",
                timeAgo = "4 hours ago",
                category = "Food",
                emoji = "🍲",
                latitude = centerLat + 6.50 * kmToLat,
                longitude = centerLng - 6.60 * kmToLon,
                distanceKm = 9.2,
                tagColor = BrandPrimary,
                tagBg = BrandPrimaryLight,
                description = "Oil, pulses, and grain supplies needed for local free meal distribution."
            ),
            NeedItem(
                id = "need_loc_8",
                title = "Rural Health Center First Aid",
                location = "Primary Clinic, $cleanLoc Bypass",
                timeAgo = "5 hours ago",
                category = "Medical",
                emoji = "🏥",
                latitude = centerLat - 10.20 * kmToLat,
                longitude = centerLng + 10.30 * kmToLon,
                distanceKm = 14.5,
                tagColor = AccentRose,
                tagBg = AccentRoseBg,
                description = "Emergency bandages, antiseptic, and ORS supplies needed."
            )
        )

        val mappedReportedNeeds = userReportedNeeds.map { item ->
            val dist = calculateDistance(centerLat, centerLng, item.latitude, item.longitude)
            item.copy(distanceKm = dist)
        }

        val mappedTemplates = templateNeeds.map { item ->
            val dist = calculateDistance(centerLat, centerLng, item.latitude, item.longitude)
            item.copy(distanceKm = dist)
        }

        return (mappedReportedNeeds + mappedTemplates).sortedBy { it.distanceKm }
    }
}
