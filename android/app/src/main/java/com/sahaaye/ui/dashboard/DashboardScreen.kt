package com.sahaaye.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.ui.components.*
import com.sahaaye.ui.location.LocationSearchBottomSheet
import com.sahaaye.ui.theme.*

@Composable
fun DashboardScreen(
    currentLocation: SahaayeLocation = SahaayeLocation.DEFAULT,
    onLocationChange: (SahaayeLocation) -> Unit = {},
    onNavigateToNearby: () -> Unit,
    onNavigateToReport: () -> Unit,
    onNavigateToActivities: () -> Unit,
    onNeedDetailClick: (NeedItem) -> Unit,
    onSelectOnMapClick: () -> Unit = {}
) {
    val stats = remember { NeedsRepository.sampleStats }
    val needs = remember(currentLocation) {
        NeedsRepository.getNeedsForLocation(currentLocation.latitude, currentLocation.longitude, currentLocation.name)
    }
    val quickActions = remember { NeedsRepository.sampleQuickActions }
    var showLocationSheet by remember { mutableStateOf(false) }
    var activeBottomTab by remember { mutableStateOf("dashboard") }

    Scaffold(
        topBar = {
            TopHeaderBar(
                selectedLocation = currentLocation.name,
                onLocationClick = { showLocationSheet = true },
                onNotificationClick = { /* Handle Notifications */ },
                onProfileClick = { /* Handle Profile */ },
                onSearchClick = onNavigateToNearby
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = CardSurface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = activeBottomTab == "dashboard",
                    onClick = { activeBottomTab = "dashboard" },
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                    label = { Text("Dashboard", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandPrimary,
                        selectedTextColor = BrandPrimary,
                        indicatorColor = BrandPrimaryLight
                    )
                )
                NavigationBarItem(
                    selected = activeBottomTab == "nearby",
                    onClick = {
                        activeBottomTab = "nearby"
                        onNavigateToNearby()
                    },
                    icon = { Icon(Icons.Default.LocationOn, contentDescription = "Nearby") },
                    label = { Text("Nearby", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandPrimary,
                        selectedTextColor = BrandPrimary,
                        indicatorColor = BrandPrimaryLight
                    )
                )
                NavigationBarItem(
                    selected = activeBottomTab == "report",
                    onClick = {
                        activeBottomTab = "report"
                        onNavigateToReport()
                    },
                    icon = { Icon(Icons.Default.AddCircle, contentDescription = "Report") },
                    label = { Text("Report", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandPrimary,
                        selectedTextColor = BrandPrimary,
                        indicatorColor = BrandPrimaryLight
                    )
                )
                NavigationBarItem(
                    selected = activeBottomTab == "activities",
                    onClick = {
                        activeBottomTab = "activities"
                        onNavigateToActivities()
                    },
                    icon = { Icon(Icons.Default.Favorite, contentDescription = "Activities") },
                    label = { Text("Activities", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandPrimary,
                        selectedTextColor = BrandPrimary,
                        indicatorColor = BrandPrimaryLight
                    )
                )
                NavigationBarItem(
                    selected = activeBottomTab == "profile",
                    onClick = { activeBottomTab = "profile" },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandPrimary,
                        selectedTextColor = BrandPrimary,
                        indicatorColor = BrandPrimaryLight
                    )
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppBackground)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // 1. Welcome Back Banner with Artwork
            WelcomeHeroCard()

            // 2. Stat Cards Row (Nearby Needs 28, In Progress 9, Completed 16, Rating 4.8)
            StatsRow(
                stats = stats,
                onStatClick = { stat ->
                    if (stat.id == "nearby") onNavigateToNearby()
                }
            )

            // 3. Interactive Live Map Card with Location pulse and Pin tap
            LiveMapCard(
                needs = needs,
                currentLocationName = currentLocation.name,
                currentLatitude = currentLocation.latitude,
                currentLongitude = currentLocation.longitude,
                onNeedPinClick = onNeedDetailClick,
                onFullMapClick = onNavigateToNearby
            )

            // 4. Needs Near You List
            NeedsNearYouSection(
                needs = needs.take(4),
                onNeedClick = onNeedDetailClick,
                onViewAllClick = onNavigateToNearby
            )

            // 5. Quick Actions Section (Find Nearby Needs, Report, etc.)
            QuickActionsSection(
                actions = quickActions,
                onActionClick = { act ->
                    when (act.id) {
                        "nearby" -> onNavigateToNearby()
                        "report" -> onNavigateToReport()
                        "activities", "myreports" -> onNavigateToActivities()
                    }
                }
            )

            // 6. Be a Helping Hand Promo Card
            HelpingHandCard(
                onExploreClick = onNavigateToNearby
            )

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Google Maps-style Interactive Location Search Modal
        if (showLocationSheet) {
            LocationSearchBottomSheet(
                currentLocation = currentLocation,
                onLocationSelected = { newLoc ->
                    onLocationChange(newLoc)
                    showLocationSheet = false
                },
                onSelectOnMapClick = {
                    showLocationSheet = false
                    onSelectOnMapClick()
                },
                onDismissRequest = { showLocationSheet = false }
            )
        }
    }
}
