package com.sahaaye.ui.nearby

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyMapScreen(
    currentLocation: SahaayeLocation = SahaayeLocation.DEFAULT,
    onLocationChange: (SahaayeLocation) -> Unit = {},
    initialManualMode: Boolean = false,
    onBackClick: () -> Unit,
    onNeedClick: (NeedItem) -> Unit
) {
    var selectedCategory by remember { mutableStateOf("All") }
    var selectedRadiusKm by remember { mutableStateOf(5.0) }
    var isMapView by remember { mutableStateOf(true) }
    var selectedNeed by remember { mutableStateOf<NeedItem?>(null) }
    var isLocating by remember { mutableStateOf(false) }

    // Manual map selection state
    var isManualPickerActive by remember { mutableStateOf(initialManualMode) }
    var manualPinOffset by remember { mutableStateOf<Offset?>(null) }
    var manualPinLocation by remember { mutableStateOf<SahaayeLocation?>(null) }

    // Google Maps-style location search query
    var mapSearchQuery by remember { mutableStateOf("") }
    var isSearchActive by remember { mutableStateOf(false) }

    val categories = listOf("All", "Food", "Medical", "Education", "Shelter", "Elderly")
    val radiusOptions = listOf(1.0, 3.0, 5.0, 10.0)

    val allNeeds = remember { NeedsRepository.sampleNeeds }

    // Calculate dynamically updated distances and filtered needs based on currentLocation
    val filteredNeeds = remember(selectedCategory, selectedRadiusKm, currentLocation) {
        allNeeds.map { need ->
            val dist = NeedsRepository.calculateDistance(
                currentLocation.latitude, currentLocation.longitude,
                need.latitude, need.longitude
            )
            need.copy(distanceKm = dist)
        }.filter { need ->
            (selectedCategory == "All" || need.category == selectedCategory) &&
                    need.distanceKm <= selectedRadiusKm
        }.sortedBy { it.distanceKm }
    }

    // Google Maps auto-suggestions matching search query
    val searchSuggestions = remember(mapSearchQuery) {
        if (mapSearchQuery.trim().isEmpty()) {
            emptyList()
        } else {
            val q = mapSearchQuery.trim().lowercase()
            SahaayeLocation.SAMPLE_LOCATIONS.filter { loc ->
                loc.name.lowercase().contains(q) ||
                loc.fullAddress.lowercase().contains(q) ||
                loc.locality.lowercase().contains(q) ||
                loc.placeType.lowercase().contains(q)
            }
        }
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
                                text = "${currentLocation.name} • ${filteredNeeds.size} needs in ${selectedRadiusKm.toInt()} km",
                                fontSize = 11.sp,
                                color = TextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
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
                    // Manual Pin Mode Toggle
                    IconButton(
                        onClick = {
                            isManualPickerActive = !isManualPickerActive
                            if (!isManualPickerActive) {
                                manualPinOffset = null
                                manualPinLocation = null
                            }
                        }
                    ) {
                        Icon(
                            imageVector = if (isManualPickerActive) Icons.Default.Place else Icons.Outlined.Place,
                            contentDescription = "Pin Mode",
                            tint = if (isManualPickerActive) AccentRose else BrandPrimary
                        )
                    }

                    // GPS Recenter
                    IconButton(onClick = {
                        isLocating = !isLocating
                        onLocationChange(SahaayeLocation.DEFAULT)
                        manualPinOffset = null
                        manualPinLocation = null
                    }) {
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

                // ── 1. Google Maps-style Search Bar ─────────────────────────────────
                Surface(
                    color = CardSurface,
                    shadowElevation = 3.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                        OutlinedTextField(
                            value = mapSearchQuery,
                            onValueChange = {
                                mapSearchQuery = it
                                isSearchActive = it.isNotEmpty()
                            },
                            placeholder = {
                                Text(
                                    text = "Search gali, mohalla, colony, landmark…",
                                    fontSize = 13.sp,
                                    color = TextMuted
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = "Search",
                                    tint = BrandPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            },
                            trailingIcon = {
                                if (mapSearchQuery.isNotEmpty()) {
                                    IconButton(onClick = {
                                        mapSearchQuery = ""
                                        isSearchActive = false
                                    }) {
                                        Icon(
                                            imageVector = Icons.Default.Clear,
                                            contentDescription = "Clear",
                                            tint = TextSecondary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandPrimary,
                                unfocusedBorderColor = BorderSubtle,
                                focusedContainerColor = Color(0xFFF8FAFC),
                                unfocusedContainerColor = Color(0xFFF8FAFC)
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // ── 2. Filter Controls: Category Pills & Radius Options ──────────────
                Surface(
                    color = CardSurface,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(vertical = 6.dp)) {
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
                            // Radius Options (1km, 3km, 5km, 10km)
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

                // Manual Pin Selector Status Bar (if active)
                if (isManualPickerActive) {
                    Surface(
                        color = Color(0xFFFFF1F2),
                        border = BorderStroke(1.dp, Color(0xFFFECDD3)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.TouchApp, contentDescription = null, tint = AccentRose, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Tap anywhere on the map to set location pin",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = AccentRose
                                )
                            }
                            Text(
                                text = "Done",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandPrimary,
                                modifier = Modifier.clickable { isManualPickerActive = false }
                            )
                        }
                    }
                }

                // ── 3. Main Content: Interactive Map or List ────────────────────────────
                if (isMapView) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        // Interactive Map Canvas with Gesture Detection
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .pointerInput(Unit) {
                                    detectTapGestures { tapOffset ->
                                        // User tapped on the map canvas
                                        manualPinOffset = tapOffset
                                        selectedNeed = null

                                        // Reverse match nearest location or synthesize custom pin
                                        val normX = tapOffset.x / size.width
                                        val normY = tapOffset.y / size.height
                                        val offsetLat = (0.5 - normY) * 0.08
                                        val offsetLng = (normX - 0.5) * 0.08
                                        val calcLat = currentLocation.latitude + offsetLat
                                        val calcLng = currentLocation.longitude + offsetLng

                                        // Find closest locality name from samples or compose street name
                                        val nearest = SahaayeLocation.SAMPLE_LOCATIONS.minByOrNull {
                                            NeedsRepository.calculateDistance(calcLat, calcLng, it.latitude, it.longitude)
                                        }

                                        manualPinLocation = SahaayeLocation(
                                            id = "map_pin_${System.currentTimeMillis()}",
                                            name = nearest?.name ?: "Pinned Location",
                                            fullAddress = "Near ${nearest?.fullAddress ?: "MG Road, Indore, MP 452001"}",
                                            locality = nearest?.locality ?: "Indore Area",
                                            latitude = calcLat,
                                            longitude = calcLng,
                                            placeType = "Map Pin"
                                        )
                                    }
                                }
                        ) {
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

                            // Current Location Center Badge
                            Box(
                                modifier = Modifier
                                    .align(Alignment.Center)
                                    .offset(y = (-30).dp)
                                    .background(Color.White.copy(alpha = 0.92f), RoundedCornerShape(8.dp))
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "📍 ${currentLocation.name}",
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
                                            .clickable {
                                                selectedNeed = need
                                                manualPinOffset = null
                                                manualPinLocation = null
                                            }
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(text = need.emoji, fontSize = if (isSelected) 18.sp else 15.sp)
                                        }
                                    }
                                }
                            }

                            // Manual Dropped Pin Marker
                            manualPinOffset?.let { offset ->
                                Box(
                                    modifier = Modifier
                                        .offset(
                                            x = (offset.x / 2.7).dp - 18.dp,
                                            y = (offset.y / 2.7).dp - 36.dp
                                        )
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Surface(
                                            color = AccentRose,
                                            shape = CircleShape,
                                            border = BorderStroke(2.dp, Color.White),
                                            shadowElevation = 8.dp,
                                            modifier = Modifier.size(36.dp)
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = Icons.Default.Place,
                                                    contentDescription = "Pinned Location",
                                                    tint = Color.White,
                                                    modifier = Modifier.size(22.dp)
                                                )
                                            }
                                        }
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(AccentRose, CircleShape)
                                        )
                                    }
                                }
                            }
                        }

                        // Floating Recenter & Pick Pin Buttons (Top-End)
                        Column(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            FloatingActionButton(
                                onClick = {
                                    isManualPickerActive = !isManualPickerActive
                                },
                                containerColor = if (isManualPickerActive) AccentRose else CardSurface,
                                contentColor = if (isManualPickerActive) Color.White else BrandPrimary,
                                shape = CircleShape,
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AddLocationAlt,
                                    contentDescription = "Tap to pick pin"
                                )
                            }

                            FloatingActionButton(
                                onClick = {
                                    selectedNeed = null
                                    manualPinOffset = null
                                    manualPinLocation = null
                                    isLocating = true
                                    onLocationChange(SahaayeLocation.DEFAULT)
                                },
                                containerColor = CardSurface,
                                contentColor = BrandPrimary,
                                shape = CircleShape,
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(Icons.Default.MyLocation, contentDescription = "Recenter GPS")
                            }
                        }

                        // Bottom Need Preview Card when Pin is tapped
                        NeedPreviewSheet(
                            selectedNeed = selectedNeed,
                            onClose = { selectedNeed = null },
                            onNeedClick = onNeedClick
                        )

                        // Bottom Manual Pin Confirmation Card when Map is tapped
                        ManualPinConfirmationSheet(
                            location = manualPinLocation,
                            onConfirm = {
                                manualPinLocation?.let { loc ->
                                    onLocationChange(loc)
                                    isManualPickerActive = false
                                }
                                manualPinOffset = null
                                manualPinLocation = null
                            },
                            onDismiss = {
                                manualPinOffset = null
                                manualPinLocation = null
                            }
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

            // Google Maps Search Suggestions Dropdown Overlay
            if (isSearchActive && searchSuggestions.isNotEmpty()) {
                Surface(
                    color = CardSurface,
                    shadowElevation = 8.dp,
                    shape = RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp),
                    border = BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp)
                        .offset(y = 66.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 280.dp)
                            .padding(vertical = 4.dp)
                    ) {
                        items(searchSuggestions) { loc ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        onLocationChange(loc)
                                        mapSearchQuery = ""
                                        isSearchActive = false
                                        manualPinOffset = null
                                        manualPinLocation = null
                                    }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = BrandPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = loc.name,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = loc.fullAddress,
                                        fontSize = 11.sp,
                                        color = TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Surface(
                                    color = BorderLight,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = loc.placeType,
                                        fontSize = 9.sp,
                                        color = TextSecondary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            HorizontalDivider(color = BorderSubtle, thickness = 0.5.dp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoxScope.ManualPinConfirmationSheet(
    location: SahaayeLocation?,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    androidx.compose.animation.AnimatedVisibility(
        visible = location != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = Modifier.align(Alignment.BottomCenter)
    ) {
        location?.let { loc ->
            Card(
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .background(AccentRoseBg, CircleShape)
                                    .border(1.5.dp, AccentRose, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Place,
                                    contentDescription = "Pin",
                                    tint = AccentRose,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "PINNED LOCATION",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentRose,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    text = loc.name,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            }
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = TextMuted)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = loc.fullAddress,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onConfirm,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Set as Active Location", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                        OutlinedButton(
                            onClick = onDismiss,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Cancel", fontSize = 13.sp)
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
