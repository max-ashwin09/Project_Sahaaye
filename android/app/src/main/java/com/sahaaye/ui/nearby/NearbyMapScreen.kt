package com.sahaaye.ui.nearby

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyMapScreen(
    onBackClick: () -> Unit,
    onNeedClick: (NeedItem) -> Unit
) {
    var selectedCategory by remember { mutableStateOf("All") }
    var selectedRadiusKm by remember { mutableStateOf(5.0) }
    var isMapView by remember { mutableStateOf(true) }
    var selectedNeed by remember { mutableStateOf<NeedItem?>(null) }
    var isLocating by remember { mutableStateOf(false) }

    val categories = listOf("All", "Food", "Medical", "Education", "Shelter", "Elderly")
    val radiusOptions = listOf(1.0, 3.0, 5.0, 10.0)

    val allNeeds = remember { NeedsRepository.sampleNeeds }
    val filteredNeeds = remember(selectedCategory, selectedRadiusKm) {
        allNeeds.filter { need ->
            (selectedCategory == "All" || need.category == selectedCategory) &&
                    need.distanceKm <= selectedRadiusKm
        }.sortedBy { it.distanceKm }
    }

    // User location animation
    val infiniteTransition = rememberInfiniteTransition(label = "nearby_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(1300, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "scale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1300, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "alpha"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Nearby Needs Explorer",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Location",
                                tint = BrandPrimary,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "Indore, MP • ${filteredNeeds.size} needs within ${selectedRadiusKm.toInt()} km",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                    }
                },
                actions = {
                    IconButton(onClick = { isLocating = !isLocating }) {
                        Icon(
                            imageVector = Icons.Default.MyLocation,
                            contentDescription = "My Location",
                            tint = if (isLocating) StatCompleted else BrandPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardSurface)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppBackground)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {

                // ── Filter Controls Row ──────────────────────────────────────────────
                Surface(
                    color = CardSurface,
                    shadowElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(vertical = 8.dp)) {
                        // Category Pills
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(categories) { cat ->
                                val isSelected = selectedCategory == cat
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategory = cat },
                                    label = { Text(cat, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BrandPrimary,
                                        selectedLabelColor = TextInverted
                                    )
                                )
                            }
                        }

                        // Radius and View Toggle Row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Radius Options
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("Radius:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                                radiusOptions.forEach { rad ->
                                    val isSelected = selectedRadiusKm == rad
                                    Surface(
                                        color = if (isSelected) BrandPrimaryLight else BorderLight,
                                        shape = RoundedCornerShape(12.dp),
                                        border = if (isSelected) BorderStroke(1.dp, BrandPrimary) else null,
                                        modifier = Modifier.clickable { selectedRadiusKm = rad }
                                    ) {
                                        Text(
                                            text = "${rad.toInt()}km",
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSelected) BrandPrimary else TextSecondary,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }

                            // View Toggle (Map / List)
                            Surface(
                                color = BorderLight,
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(modifier = Modifier.padding(2.dp)) {
                                    Surface(
                                        color = if (isMapView) BrandPrimary else Color.Transparent,
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.clickable { isMapView = true }
                                    ) {
                                        Text(
                                            text = "🗺️ Map",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isMapView) TextInverted else TextSecondary,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                    Surface(
                                        color = if (!isMapView) BrandPrimary else Color.Transparent,
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.clickable { isMapView = false }
                                    ) {
                                        Text(
                                            text = "📋 List",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (!isMapView) TextInverted else TextSecondary,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Main Content: Interactive Map or List ────────────────────────────
                if (isMapView) {
                    // Interactive Map Screen View
                    Box(modifier = Modifier.fillMaxSize()) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height

                            // Draw Map Background
                            drawRect(Color(0xFFE8F5E9))

                            // Roads & Geographical lines
                            drawLine(Color(0xFFC8E6C9), Offset(0f, h * 0.25f), Offset(w, h * 0.25f), strokeWidth = 12f)
                            drawLine(Color(0xFFC8E6C9), Offset(0f, h * 0.50f), Offset(w, h * 0.50f), strokeWidth = 16f)
                            drawLine(Color(0xFFC8E6C9), Offset(0f, h * 0.75f), Offset(w, h * 0.75f), strokeWidth = 10f)

                            drawLine(Color(0xFFC8E6C9), Offset(w * 0.25f, 0f), Offset(w * 0.25f, h), strokeWidth = 10f)
                            drawLine(Color(0xFFC8E6C9), Offset(w * 0.50f, 0f), Offset(w * 0.50f, h), strokeWidth = 18f)
                            drawLine(Color(0xFFC8E6C9), Offset(w * 0.75f, 0f), Offset(w * 0.75f, h), strokeWidth = 10f)

                            // User location blue pulse
                            drawCircle(
                                color = BrandPrimary.copy(alpha = pulseAlpha),
                                radius = 32.dp.toPx() * pulseScale,
                                center = Offset(w * 0.5f, h * 0.45f)
                            )
                            drawCircle(
                                color = Color.White,
                                radius = 12.dp.toPx(),
                                center = Offset(w * 0.5f, h * 0.45f)
                            )
                            drawCircle(
                                color = BrandPrimary,
                                radius = 8.dp.toPx(),
                                center = Offset(w * 0.5f, h * 0.45f)
                            )
                        }

                        // Indore Center Badge
                        Box(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .offset(y = (-30).dp)
                                .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(8.dp))
                                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "You are in Indore Center",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }

                        // Need Pin Markers on Map
                        val pinPositions = listOf(
                            Offset(0.25f, 0.25f),
                            Offset(0.70f, 0.32f),
                            Offset(0.30f, 0.65f),
                            Offset(0.75f, 0.60f),
                            Offset(0.48f, 0.20f),
                            Offset(0.55f, 0.70f)
                        )

                        filteredNeeds.take(pinPositions.size).forEachIndexed { i, need ->
                            val pos = pinPositions[i]
                            val isSelected = selectedNeed?.id == need.id

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(
                                        start = (pos.x * 320).dp,
                                        top = (pos.y * 380).dp
                                    )
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = if (isSelected) Color.Black else need.tagColor,
                                    shadowElevation = if (isSelected) 8.dp else 4.dp,
                                    border = if (isSelected) BorderStroke(2.dp, Color.White) else null,
                                    modifier = Modifier
                                        .size(if (isSelected) 42.dp else 34.dp)
                                        .clickable { selectedNeed = need }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(text = need.emoji, fontSize = if (isSelected) 18.sp else 15.sp)
                                    }
                                }
                            }
                        }

                        // Floating Recenter Button
                        FloatingActionButton(
                            onClick = {
                                selectedNeed = null
                                isLocating = true
                            },
                            containerColor = CardSurface,
                            contentColor = BrandPrimary,
                            shape = CircleShape,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(16.dp)
                                .size(44.dp)
                        ) {
                            Icon(Icons.Default.MyLocation, contentDescription = "Recenter GPS")
                        }

                        // Bottom Need Preview Card when Pin is tapped
                        NeedPreviewSheet(
                            selectedNeed = selectedNeed,
                            onClose = { selectedNeed = null },
                            onNeedClick = onNeedClick
                        )
                    }
                } else {
                    // List View of Nearby Needs
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredNeeds) { need ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = CardSurface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onNeedClick(need) }
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Row(modifier = Modifier.weight(1f)) {
                                            Box(
                                                modifier = Modifier
                                                    .size(44.dp)
                                                    .clip(RoundedCornerShape(10.dp))
                                                    .background(need.tagBg),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(need.emoji, fontSize = 22.sp)
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text(need.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text("📍 ${need.location}", fontSize = 12.sp, color = TextSecondary)
                                                Text("⏱ ${need.timeAgo}", fontSize = 11.sp, color = TextMuted)
                                            }
                                        }
                                        Surface(
                                            color = BrandPrimaryLight,
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                text = "${need.distanceKm} km",
                                                color = BrandPrimary,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = need.description,
                                        fontSize = 13.sp,
                                        color = TextSecondary,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            color = need.tagBg,
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text(
                                                text = need.category,
                                                color = need.tagColor,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                            )
                                        }
                                        Button(
                                            onClick = { onNeedClick(need) },
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                        ) {
                                            Text("Help Now →", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoxScope.NeedPreviewSheet(
    selectedNeed: NeedItem?,
    onClose: () -> Unit,
    onNeedClick: (NeedItem) -> Unit
) {
    androidx.compose.animation.AnimatedVisibility(
        visible = selectedNeed != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = Modifier.align(Alignment.BottomCenter)
    ) {
        selectedNeed?.let { need ->
            Card(
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 0.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(need.tagBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(need.emoji, fontSize = 20.sp)
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(need.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("📍 ${need.location} (${need.distanceKm} km away)", fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                        IconButton(onClick = onClose) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(need.description, fontSize = 13.sp, color = TextSecondary, lineHeight = 18.sp)

                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = { onNeedClick(need) },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Offer Help Now", fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = { /* Direction action */ },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Directions, contentDescription = "Directions", tint = BrandPrimary)
                        }
                    }
                }
            }
        }
    }
}
