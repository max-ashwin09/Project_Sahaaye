package com.sahaaye.data.model

import androidx.compose.ui.graphics.Color
import com.sahaaye.ui.theme.*

data class NeedItem(
    val id: String,
    val title: String,
    val location: String,
    val timeAgo: String,
    val category: String,
    val emoji: String,
    val latitude: Double,
    val longitude: Double,
    val distanceKm: Double,
    val tagColor: Color,
    val tagBg: Color,
    val description: String = ""
)

data class StatCardModel(
    val id: String,
    val value: String,
    val label: String,
    val iconEmoji: String,
    val trend: String,
    val color: Color,
    val bg: Color
)

data class QuickActionModel(
    val id: String,
    val label: String,
    val subtitle: String,
    val iconEmoji: String,
    val backgroundColor: Color,
    val iconBgColor: Color
)
