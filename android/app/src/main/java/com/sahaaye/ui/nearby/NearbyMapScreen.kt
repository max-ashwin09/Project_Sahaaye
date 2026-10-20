package com.sahaaye.ui.nearby

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.data.service.WorldwideLocationService
import com.sahaaye.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class MapWebBridge(
    private val onMapReadyCallback: () -> Unit,
    private val onMapClickCallback: (Double, Double) -> Unit,
    private val onNeedClickCallback: (String) -> Unit
) {
    @JavascriptInterface
    fun onMapReady() {
        onMapReadyCallback()
    }

    @JavascriptInterface
    fun onMapClicked(lat: Double, lng: Double) {
        onMapClickCallback(lat, lng)
    }

    @JavascriptInterface
    fun onNeedMarkerClicked(needId: String) {
        onNeedClickCallback(needId)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyMapScreen(
    currentLocation: SahaayeLocation = SahaayeLocation.DEFAULT,
    onLocationChange: (SahaayeLocation) -> Unit = {},
    initialManualMode: Boolean = false,
    onBackClick: () -> Unit,
    onNeedClick: (NeedItem) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var selectedCategory by remember { mutableStateOf("All") }
    var selectedRadiusKm by remember { mutableStateOf(5.0) }
    var isMapView by remember { mutableStateOf(true) }
    var selectedNeed by remember { mutableStateOf<NeedItem?>(null) }

    // Custom Radius Dialog State
    var showCustomRadiusDialog by remember { mutableStateOf(false) }
    var customRadiusInput by remember { mutableStateOf("") }
    var showPinchHint by remember { mutableStateOf(false) }

    // Auto-dismiss pinch hint after 3 seconds
    LaunchedEffect(showPinchHint) {
        if (showPinchHint) {
            delay(3000)
            showPinchHint = false
        }
    }

    // Manual map pin state
    var isManualPickerActive by remember { mutableStateOf(initialManualMode) }
    var manualPinLocation by remember { mutableStateOf<SahaayeLocation?>(null) }
    var isReverseGeocoding by remember { mutableStateOf(false) }

    // Top Google Maps Worldwide search state
    var mapSearchQuery by remember { mutableStateOf("") }
    var searchSuggestions by remember { mutableStateOf<List<SahaayeLocation>>(emptyList()) }
    var isSearchingWorldwide by remember { mutableStateOf(false) }

    // Map WebView instance & loaded state
    var mapWebView by remember { mutableStateOf<WebView?>(null) }
    var isMapReady by remember { mutableStateOf(false) }

    val categories = listOf("All", "Food", "Medical", "Education", "Shelter", "Elderly")
    val presetRadii = listOf(1.0, 3.0, 5.0, 10.0)

    // Compute realistic needs centered at currentLocation
    val allNeeds = remember(currentLocation) {
        NeedsRepository.getNeedsForLocation(
            currentLocation.latitude,
            currentLocation.longitude,
            currentLocation.name
        )
    }

    // Filter strictly by selected radius and category
    val filteredNeeds = remember(selectedCategory, selectedRadiusKm, allNeeds) {
        allNeeds.filter { need ->
            val matchesCat = selectedCategory == "All" || need.category.equals(selectedCategory, ignoreCase = true)
            val matchesRadius = need.distanceKm <= selectedRadiusKm
            matchesCat && matchesRadius
        }.sortedBy { it.distanceKm }
    }

    // Debounced worldwide search in top search bar
    LaunchedEffect(mapSearchQuery) {
        val trimmed = mapSearchQuery.trim()
        if (trimmed.isEmpty()) {
            searchSuggestions = emptyList()
            isSearchingWorldwide = false
        } else {
            isSearchingWorldwide = true
            delay(350)
            val results = WorldwideLocationService.searchLocations(trimmed, context)
            searchSuggestions = results
            isSearchingWorldwide = false
        }
    }

    // Sync map when location, radius, or filtered needs change
    LaunchedEffect(isMapReady, currentLocation, selectedRadiusKm, filteredNeeds) {
        if (isMapReady && mapWebView != null) {
            val needsJson = formatNeedsJson(filteredNeeds)
            mapWebView?.evaluateJavascript(
                "renderActiveLocation(${currentLocation.latitude}, ${currentLocation.longitude}, $selectedRadiusKm, false);",
                null
            )
            mapWebView?.evaluateJavascript(
                "updateNeedsMarkers($needsJson);",
                null
            )
        }
    }

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
                            val radiusLabel = if (selectedRadiusKm == selectedRadiusKm.toInt().toDouble()) {
                                "${selectedRadiusKm.toInt()} km"
                            } else {
                                "$selectedRadiusKm km"
                            }
                            Text(
                                text = "${currentLocation.name} • ${filteredNeeds.size} needs in $radiusLabel",
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
                    // Recenter GPS
                    IconButton(onClick = {
                        coroutineScope.launch {
                            val gpsLoc = WorldwideLocationService.reverseGeocode(
                                currentLocation.latitude,
                                currentLocation.longitude,
                                context
                            )
                            onLocationChange(gpsLoc)
                            manualPinLocation = null
                            mapWebView?.evaluateJavascript("clearDroppedPin();", null)
                            mapWebView?.evaluateJavascript(
                                "renderActiveLocation(${gpsLoc.latitude}, ${gpsLoc.longitude}, $selectedRadiusKm, true);",
                                null
                            )
                        }
                    }) {
                        Icon(
                            imageVector = Icons.Default.MyLocation,
                            contentDescription = "My Location",
                            tint = BrandPrimary
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

                // ── 1. Google Maps-style Worldwide Search Bar ────────────────────────
                Surface(
                    color = CardSurface,
                    shadowElevation = 3.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                        OutlinedTextField(
                            value = mapSearchQuery,
                            onValueChange = { mapSearchQuery = it },
                            placeholder = {
                                Text(
                                    text = "Search location",
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
                                if (isSearchingWorldwide) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp,
                                        color = BrandPrimary
                                    )
                                } else if (mapSearchQuery.isNotEmpty()) {
                                    IconButton(onClick = { mapSearchQuery = "" }) {
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

                        // Live Search Suggestions Dropdown
                        if (searchSuggestions.isNotEmpty() && mapSearchQuery.trim().isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Surface(
                                color = CardSurface,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, BorderSubtle),
                                shadowElevation = 6.dp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 240.dp)
                            ) {
                                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                                    items(searchSuggestions) { suggestion ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    onLocationChange(suggestion)
                                                    mapSearchQuery = ""
                                                    manualPinLocation = null
                                                    mapWebView?.evaluateJavascript("clearDroppedPin();", null)
                                                    mapWebView?.evaluateJavascript(
                                                        "renderActiveLocation(${suggestion.latitude}, ${suggestion.longitude}, $selectedRadiusKm, true);",
                                                        null
                                                    )
                                                }
                                                .padding(horizontal = 14.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Place,
                                                contentDescription = null,
                                                tint = BrandPrimary,
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = suggestion.name,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = TextPrimary,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = suggestion.fullAddress,
                                                    fontSize = 11.sp,
                                                    color = TextSecondary,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                        HorizontalDivider(color = BorderLight, thickness = 0.5.dp)
                                    }
                                }
                            }
                        }
                    }
                }

                // ── 2. Filter Controls: Category Pills & Radius Options ──────────────
                Surface(
                    color = CardSurface,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(vertical = 6.dp)) {
                        // Category Filter Chips
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 14.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(categories) { category ->
                                val isSelected = selectedCategory == category
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategory = category },
                                    label = {
                                        Text(
                                            text = category,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BrandPrimary,
                                        selectedLabelColor = TextInverted,
                                        containerColor = CardSurface,
                                        labelColor = TextSecondary
                                    ),
                                    border = FilterChipDefaults.filterChipBorder(
                                        enabled = true,
                                        selected = isSelected,
                                        borderColor = if (isSelected) BrandPrimary else BorderSubtle,
                                        borderWidth = 1.dp
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Radius Filter Chips + Custom Radius & Map/List Toggle
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = "Radius:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextSecondary
                                )

                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    items(presetRadii) { radius ->
                                        val isSelected = selectedRadiusKm == radius
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (isSelected) BrandPrimaryLight else CardSurface,
                                            border = BorderStroke(
                                                1.dp,
                                                if (isSelected) BrandPrimary else BorderSubtle
                                            ),
                                            modifier = Modifier.clickable {
                                                selectedRadiusKm = radius
                                                showPinchHint = true
                                                mapWebView?.evaluateJavascript(
                                                    "renderActiveLocation(${currentLocation.latitude}, ${currentLocation.longitude}, $radius, true);",
                                                    null
                                                )
                                            }
                                        ) {
                                            Text(
                                                text = "${radius.toInt()}km",
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) BrandPrimary else TextSecondary,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                                            )
                                        }
                                    }

                                    // Custom Radius Chip
                                    item {
                                        val isCustomActive = selectedRadiusKm !in presetRadii
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (isCustomActive) BrandPrimaryLight else CardSurface,
                                            border = BorderStroke(
                                                1.dp,
                                                if (isCustomActive) BrandPrimary else BorderSubtle
                                            ),
                                            modifier = Modifier.clickable {
                                                customRadiusInput = if (isCustomActive) "$selectedRadiusKm" else ""
                                                showCustomRadiusDialog = true
                                            }
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Edit,
                                                    contentDescription = "Custom Radius",
                                                    tint = if (isCustomActive) BrandPrimary else TextSecondary,
                                                    modifier = Modifier.size(11.dp)
                                                )
                                                Spacer(modifier = Modifier.width(3.dp))
                                                Text(
                                                    text = if (isCustomActive) "${selectedRadiusKm}km" else "Custom",
                                                    fontSize = 11.sp,
                                                    fontWeight = if (isCustomActive) FontWeight.Bold else FontWeight.Medium,
                                                    color = if (isCustomActive) BrandPrimary else TextSecondary
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // View Toggle (Map / List)
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = CardSurface,
                                border = BorderStroke(1.dp, BorderSubtle)
                            ) {
                                Row {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp))
                                            .background(if (isMapView) BrandPrimary else Color.Transparent)
                                            .clickable { isMapView = true }
                                            .padding(horizontal = 8.dp, vertical = 5.dp)
                                    ) {
                                        Text(
                                            text = "🗺️ Map",
                                            fontSize = 11.sp,
                                            color = if (isMapView) TextInverted else TextSecondary,
                                            fontWeight = if (isMapView) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp))
                                            .background(if (!isMapView) BrandPrimary else Color.Transparent)
                                            .clickable { isMapView = false }
                                            .padding(horizontal = 8.dp, vertical = 5.dp)
                                    ) {
                                        Text(
                                            text = "📋 List",
                                            fontSize = 11.sp,
                                            color = if (!isMapView) TextInverted else TextSecondary,
                                            fontWeight = if (!isMapView) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── 3. Main Content: Real Interactive Map or List ────────────────────
                if (isMapView) {
                    Box(modifier = Modifier.fillMaxSize()) {

                        // Embedded Real Interactive Leaflet / Google-style Map View
                        AndroidView(
                            factory = { ctx ->
                                WebView(ctx).apply {
                                    layoutParams = ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    settings.apply {
                                        javaScriptEnabled = true
                                        domStorageEnabled = true
                                        allowFileAccess = true
                                        setSupportZoom(true)
                                        builtInZoomControls = false
                                        displayZoomControls = false
                                        cacheMode = WebSettings.LOAD_DEFAULT
                                    }
                                    webViewClient = object : WebViewClient() {
                                        override fun onPageFinished(view: WebView?, url: String?) {
                                            super.onPageFinished(view, url)
                                            isMapReady = true
                                            val needsJson = formatNeedsJson(filteredNeeds)
                                            evaluateJavascript(
                                                "renderActiveLocation(${currentLocation.latitude}, ${currentLocation.longitude}, $selectedRadiusKm, true);",
                                                null
                                            )
                                            evaluateJavascript(
                                                "updateNeedsMarkers($needsJson);",
                                                null
                                            )
                                        }
                                    }
                                    addJavascriptInterface(
                                        MapWebBridge(
                                            onMapReadyCallback = {
                                                isMapReady = true
                                            },
                                            onMapClickCallback = { lat, lng ->
                                                coroutineScope.launch {
                                                    isReverseGeocoding = true
                                                    val loc = WorldwideLocationService.reverseGeocode(lat, lng, ctx)
                                                    manualPinLocation = loc
                                                    isReverseGeocoding = false
                                                }
                                            },
                                            onNeedClickCallback = { needId ->
                                                val need = allNeeds.find { it.id == needId }
                                                if (need != null) {
                                                    selectedNeed = need
                                                    manualPinLocation = null
                                                }
                                            }
                                        ),
                                        "AndroidBridge"
                                    )
                                    setOnTouchListener { v, _ ->
                                        v.parent.requestDisallowInterceptTouchEvent(true)
                                        false
                                    }
                                    loadUrl("file:///android_asset/map/index.html")
                                    mapWebView = this
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )

                        // Top Instruction Pill for Map (Only visible for 2-4 seconds when radius is customized)
                        androidx.compose.animation.AnimatedVisibility(
                            visible = showPinchHint,
                            enter = fadeIn() + slideInVertically(initialOffsetY = { -it }),
                            exit = fadeOut() + slideOutVertically(targetOffsetY = { -it }),
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 10.dp)
                        ) {
                            Surface(
                                color = Color.White.copy(alpha = 0.94f),
                                shape = RoundedCornerShape(20.dp),
                                border = BorderStroke(1.dp, BorderSubtle),
                                shadowElevation = 4.dp
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.TouchApp,
                                        contentDescription = null,
                                        tint = BrandPrimary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Pinch to zoom in/out • Tap anywhere to drop pin",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary
                                    )
                                }
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
                            isLoading = isReverseGeocoding,
                            onConfirm = {
                                manualPinLocation?.let { loc ->
                                    onLocationChange(loc)
                                }
                                manualPinLocation = null
                                mapWebView?.evaluateJavascript("clearDroppedPin();", null)
                            },
                            onCancel = {
                                manualPinLocation = null
                                mapWebView?.evaluateJavascript("clearDroppedPin();", null)
                            }
                        )
                    }
                } else {
                    // List View: All needs within selectedRadiusKm
                    if (filteredNeeds.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "🔍", fontSize = 48.sp)
                                Spacer(modifier = Modifier.height(12.dp))
                                val radiusLabel = if (selectedRadiusKm == selectedRadiusKm.toInt().toDouble()) {
                                    "${selectedRadiusKm.toInt()} km"
                                } else {
                                    "$selectedRadiusKm km"
                                }
                                Text(
                                    text = "No needs found within $radiusLabel",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Try increasing your search radius or changing category filters to see more requests.",
                                    fontSize = 13.sp,
                                    color = TextSecondary,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = {
                                        selectedRadiusKm = 25.0
                                        selectedCategory = "All"
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Expand to 25 km")
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(filteredNeeds, key = { it.id }) { need ->
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = CardSurface,
                                    border = BorderStroke(1.dp, BorderSubtle),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onNeedClick(need) }
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(36.dp)
                                                        .background(need.tagBg, CircleShape),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(text = need.emoji, fontSize = 18.sp)
                                                }
                                                Spacer(modifier = Modifier.width(10.dp))
                                                Column {
                                                    Text(
                                                        text = need.title,
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextPrimary
                                                    )
                                                    Text(
                                                        text = "📍 ${need.location}",
                                                        fontSize = 11.sp,
                                                        color = TextSecondary
                                                    )
                                                }
                                            }

                                            // Distance Badge
                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = BrandPrimaryLight
                                            ) {
                                                Text(
                                                    text = "${need.distanceKm} km away",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = BrandPrimary,
                                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        Text(
                                            text = need.description,
                                            fontSize = 12.sp,
                                            color = TextSecondary,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── Custom Radius Input Dialog ──────────────────────────────────────────
            if (showCustomRadiusDialog) {
                AlertDialog(
                    onDismissRequest = { showCustomRadiusDialog = false },
                    title = {
                        Text(
                            text = "Set Custom Search Radius",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    },
                    text = {
                        Column {
                            Text(
                                text = "Enter search distance in kilometers (e.g. 2, 7.5, 15, 50). Only community needs within this radius will be displayed.",
                                fontSize = 13.sp,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = customRadiusInput,
                                onValueChange = { customRadiusInput = it },
                                placeholder = { Text("Radius in km (e.g. 7)") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                val entered = customRadiusInput.trim().toDoubleOrNull()
                                if (entered != null && entered > 0.0) {
                                    selectedRadiusKm = entered
                                    showPinchHint = true
                                    mapWebView?.evaluateJavascript(
                                        "renderActiveLocation(${currentLocation.latitude}, ${currentLocation.longitude}, $entered, true);",
                                        null
                                    )
                                }
                                showCustomRadiusDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                        ) {
                            Text("Apply Radius")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showCustomRadiusDialog = false }) {
                            Text("Cancel", color = TextSecondary)
                        }
                    }
                )
            }
        }
    }
}

// ── Manual Pin Confirmation Bottom Card ───────────────────────────────────────
@Composable
private fun BoxScope.ManualPinConfirmationSheet(
    location: SahaayeLocation?,
    isLoading: Boolean,
    onConfirm: () -> Unit,
    onCancel: () -> Unit
) {
    AnimatedVisibility(
        visible = location != null || isLoading,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = Modifier.align(Alignment.BottomCenter)
    ) {
        Surface(
            color = CardSurface,
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            shadowElevation = 16.dp,
            border = BorderStroke(1.dp, BorderSubtle),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                if (isLoading) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = BrandPrimary)
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(text = "Identifying address from map pin…", fontSize = 13.sp, color = TextSecondary)
                    }
                } else if (location != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .background(Color(0xFFFFE4E6), CircleShape),
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
                                    letterSpacing = 0.8.sp
                                )
                                Text(
                                    text = location.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = location.fullAddress,
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    lineHeight = 15.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        IconButton(onClick = onCancel, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Cancel", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onConfirm,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Set as Active Location", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = onCancel,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, BorderSubtle)
                        ) {
                            Text("Cancel", fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}

// ── Need Preview Bottom Sheet ────────────────────────────────────────────────
@Composable
private fun BoxScope.NeedPreviewSheet(
    selectedNeed: NeedItem?,
    onClose: () -> Unit,
    onNeedClick: (NeedItem) -> Unit
) {
    AnimatedVisibility(
        visible = selectedNeed != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = Modifier.align(Alignment.BottomCenter)
    ) {
        selectedNeed?.let { need ->
            Surface(
                color = CardSurface,
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                shadowElevation = 16.dp,
                border = BorderStroke(1.dp, BorderSubtle),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(need.tagBg, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(text = need.emoji, fontSize = 22.sp)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = need.title,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "📍 ${need.location} • ${need.distanceKm} km away",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                        }

                        IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary, modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = need.description,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        lineHeight = 16.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { onNeedClick(need) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                    ) {
                        Text("🤝 Offer Help / Respond to Need", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

private fun formatNeedsJson(needs: List<NeedItem>): String {
    val array = JSONArray()
    needs.forEach { item ->
        val obj = JSONObject()
        obj.put("id", item.id)
        obj.put("title", item.title)
        obj.put("location", item.location)
        obj.put("category", item.category)
        obj.put("emoji", item.emoji)
        obj.put("latitude", item.latitude)
        obj.put("longitude", item.longitude)
        obj.put("distanceKm", item.distanceKm)
        array.put(obj)
    }
    return JSONObject.quote(array.toString())
}
