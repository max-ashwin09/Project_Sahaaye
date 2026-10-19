package com.sahaaye.data.repository

import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.QuickActionModel
import com.sahaaye.data.model.StatCardModel
import com.sahaaye.ui.theme.*
import androidx.compose.ui.graphics.Color
import kotlin.math.*

object NeedsRepository {

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
}
