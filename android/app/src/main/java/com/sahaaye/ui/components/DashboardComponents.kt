package com.sahaaye.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.R
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.QuickActionModel
import com.sahaaye.data.model.StatCardModel
import com.sahaaye.ui.theme.*

// ─── 1. TOP HEADER BAR ────────────────────────────────────────────────────────
@Composable
fun TopHeaderBar(
    selectedLocation: String,
    onLocationClick: () -> Unit,
    onNotificationClick: () -> Unit,
    onProfileClick: () -> Unit = {},
    onSearchClick: () -> Unit
) {
    Surface(
        color = CardSurface,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 1. Centered SAHAAYE Logo & Name (Larger & Prominent)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.clickable { onLocationClick() }
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 4.dp,
                    border = BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(4.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.sahaaye_icon),
                            contentDescription = "Sahaaye Logo",
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "SAHAAYE",
                    fontSize = 25.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandPrimary,
                    letterSpacing = 1.sp
                )
            }

            // 2. Centered Slogan directly below Logo
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = "People Help People",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                letterSpacing = 0.3.sp
            )

            Spacer(modifier = Modifier.height(14.dp))

            // 3. Single Row with 3 elements: [Location Pill] + [Search Box] + [Notification Bell]
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Location Pill (Auto-adjusting width, max-lines 1, with Google Maps-style dropdown)
                Surface(
                    color = BorderLight,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .widthIn(min = 90.dp, max = 145.dp)
                        .clickable { onLocationClick() }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = BrandPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = selectedLocation,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = "Select Location",
                            tint = TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                // Search Box (Middle - fills flexible remaining space)
                Surface(
                    color = BorderLight,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onSearchClick() }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = TextMuted,
                            modifier = Modifier.size(17.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Search needs…",
                            color = TextMuted,
                            fontSize = 12.sp,
                            maxLines = 1
                        )
                    }
                }

                // Notification Bell with High-Visibility Badge (Right)
                Box(
                    modifier = Modifier.wrapContentSize(),
                    contentAlignment = Alignment.TopEnd
                ) {
                    Surface(
                        color = BorderLight,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .size(42.dp)
                            .clickable { onNotificationClick() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.Notifications,
                                contentDescription = "Notifications",
                                tint = TextPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                    // High-visibility, crisp Notification Badge
                    Surface(
                        color = Color(0xFFE11D48),
                        shape = CircleShape,
                        border = BorderStroke(1.5.dp, Color.White),
                        shadowElevation = 3.dp,
                        modifier = Modifier.offset(x = 4.dp, y = (-4).dp)
                    ) {
                        Text(
                            text = "12",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                        )
                    }
                }
            }
        }
    }
}

// ─── 2. WELCOME BANNER ────────────────────────────────────────────────────────
@Composable
fun WelcomeHeroCard() {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFFEFF6FF), Color(0xFFF0FDF4))
                    )
                )
                .padding(16.dp)
        ) {
            Column {
                Text(
                    text = "Welcome to SAHAAYE! 👋",
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Small actions create big changes. Let's keep making a difference.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    color = Color.White.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "“", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BrandPrimary)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Helping people builds stronger communities.",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

// ─── 3. STAT CARDS ROW ────────────────────────────────────────────────────────
@Composable
fun StatsRow(
    stats: List<StatCardModel>,
    onStatClick: (StatCardModel) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(stats) { stat ->
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier
                    .width(140.dp)
                    .clickable { onStatClick(stat) }
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(stat.bg),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = stat.iconEmoji, fontSize = 16.sp)
                        }
                        Surface(
                            color = Color(0xFFF0FDF4),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = stat.trend,
                                color = StatCompleted,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = stat.value,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = stat.color
                    )
                    Text(
                        text = stat.label,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

// ─── 4. INTERACTIVE LIVE MAP CARD ─────────────────────────────────────────────
@Composable
fun LiveMapCard(
    needs: List<NeedItem>,
    currentLocationName: String = "Indore Center",
    onNeedPinClick: (NeedItem) -> Unit,
    onFullMapClick: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf("All") }
    val categories = listOf("All", "Food", "Medical", "Education", "Shelter")

    // Pulsing animation for user location
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "scale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "alpha"
    )

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "Live Map", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(StatCompleted)
                    )
                }

                TextButton(onClick = onFullMapClick) {
                    Text("Expand Map ↗", color = BrandPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            // Category Filter Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(vertical = 6.dp)
            ) {
                items(categories) { cat ->
                    val isSelected = selectedCategory == cat
                    Surface(
                        color = if (isSelected) BrandPrimary else BorderLight,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.clickable { selectedCategory = cat }
                    ) {
                        Text(
                            text = cat,
                            color = if (isSelected) TextInverted else TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Interactive Map Canvas Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFE8F5E9))
                    .clickable { onFullMapClick() }
            ) {
                // Map background roads & grid
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val w = size.width
                    val h = size.height

                    // Grid / Roads
                    drawLine(Color(0xFFDCEDC8), Offset(0f, h * 0.35f), Offset(w, h * 0.35f), strokeWidth = 8f)
                    drawLine(Color(0xFFDCEDC8), Offset(0f, h * 0.65f), Offset(w, h * 0.65f), strokeWidth = 10f)
                    drawLine(Color(0xFFDCEDC8), Offset(w * 0.35f, 0f), Offset(w * 0.35f, h), strokeWidth = 8f)
                    drawLine(Color(0xFFDCEDC8), Offset(w * 0.70f, 0f), Offset(w * 0.70f, h), strokeWidth = 8f)

                    // User location pulse circle
                    drawCircle(
                        color = BrandPrimary.copy(alpha = pulseAlpha),
                        radius = 24.dp.toPx() * pulseScale,
                        center = Offset(w * 0.5f, h * 0.5f)
                    )
                    drawCircle(
                        color = Color.White,
                        radius = 9.dp.toPx(),
                        center = Offset(w * 0.5f, h * 0.5f)
                    )
                    drawCircle(
                        color = BrandPrimary,
                        radius = 6.dp.toPx(),
                        center = Offset(w * 0.5f, h * 0.5f)
                    )
                }

                // City / Area Center Label
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .offset(y = 20.dp)
                        .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(currentLocationName, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }

                // Pins for needs around Indore
                val filteredNeeds = if (selectedCategory == "All") needs else needs.filter { it.category == selectedCategory }
                val pinOffsets = listOf(
                    Offset(0.28f, 0.30f),
                    Offset(0.68f, 0.28f),
                    Offset(0.72f, 0.65f),
                    Offset(0.25f, 0.70f),
                    Offset(0.48f, 0.22f),
                    Offset(0.55f, 0.75f)
                )

                filteredNeeds.take(pinOffsets.size).forEachIndexed { index, need ->
                    val pos = pinOffsets[index]
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(
                                start = (pos.x * 320).dp,
                                top = (pos.y * 180).dp
                            )
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = need.tagColor,
                            shadowElevation = 4.dp,
                            modifier = Modifier
                                .size(30.dp)
                                .clickable { onNeedPinClick(need) }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(need.emoji, fontSize = 14.sp)
                            }
                        }
                    }
                }

                // Map Zoom Controls & Recenter GPS
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color.White,
                        shadowElevation = 3.dp,
                        modifier = Modifier
                            .size(32.dp)
                            .clickable { onFullMapClick() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }
                    Surface(
                        shape = CircleShape,
                        color = Color.White,
                        shadowElevation = 3.dp,
                        modifier = Modifier
                            .size(32.dp)
                            .clickable { onFullMapClick() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.MyLocation, contentDescription = "GPS", tint = BrandPrimary, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Map Legend
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                LegendDot(color = BrandPrimary, label = "Food")
                LegendDot(color = AccentRose, label = "Medical")
                LegendDot(color = StatNearby, label = "Education")
                LegendDot(color = StatProgress, label = "Shelter")
                LegendDot(color = TextMuted, label = "Others")
            }
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = label, fontSize = 11.sp, color = TextSecondary)
    }
}

// ─── 5. NEEDS NEAR YOU LIST ───────────────────────────────────────────────────
@Composable
fun NeedsNearYouSection(
    needs: List<NeedItem>,
    onNeedClick: (NeedItem) -> Unit,
    onViewAllClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Needs Near You", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                TextButton(onClick = onViewAllClick) {
                    Text("View All →", color = BrandPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                needs.forEach { need ->
                    Surface(
                        color = Color.Transparent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNeedClick(need) }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(need.tagBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(text = need.emoji, fontSize = 20.sp)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = need.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Pin",
                                        tint = TextMuted,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(2.dp))
                                    Text(
                                        text = "${need.location} • ${need.timeAgo}",
                                        fontSize = 11.sp,
                                        color = TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                color = need.tagBg,
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = need.category,
                                    color = need.tagColor,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                    if (need != needs.last()) {
                        Divider(color = BorderLight, thickness = 1.dp)
                    }
                }
            }
        }
    }
}

// ─── 6. QUICK ACTIONS GRID ────────────────────────────────────────────────────
@Composable
fun QuickActionsSection(
    actions: List<QuickActionModel>,
    onActionClick: (QuickActionModel) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = "Quick Actions", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(modifier = Modifier.height(12.dp))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Row 1
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    actions.take(2).forEach { act ->
                        QuickActionItem(act = act, modifier = Modifier.weight(1f), onClick = { onActionClick(act) })
                    }
                }
                // Row 2
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    actions.drop(2).take(2).forEach { act ->
                        QuickActionItem(act = act, modifier = Modifier.weight(1f), onClick = { onActionClick(act) })
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickActionItem(
    act: QuickActionModel,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        color = act.backgroundColor,
        shape = RoundedCornerShape(12.dp),
        modifier = modifier.clickable { onClick() }
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(act.iconBgColor),
                contentAlignment = Alignment.Center
            ) {
                Text(text = act.iconEmoji, fontSize = 16.sp)
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(text = act.label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(text = act.subtitle, fontSize = 10.sp, color = TextSecondary, maxLines = 1)
            }
        }
    }
}

// ─── 7. BE A HELPING HAND PROMO CARD ──────────────────────────────────────────
@Composable
fun HelpingHandCard(onExploreClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFFEFF6FF), Color(0xFFFCE7F3))))
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Text(text = "❤️", fontSize = 28.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Be a Helping Hand",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Support someone in need and make a real impact today.",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }
                Button(
                    onClick = onExploreClick,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(20.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text("Explore Needs →", fontSize = 11.sp, color = TextInverted, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
