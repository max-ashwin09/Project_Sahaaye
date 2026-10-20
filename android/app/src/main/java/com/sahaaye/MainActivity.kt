package com.sahaaye

import android.Manifest
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.data.service.LiveLocationService
import com.sahaaye.ui.dashboard.DashboardScreen
import com.sahaaye.ui.nearby.NearbyMapScreen
import com.sahaaye.ui.report.ReportNeedScreen
import com.sahaaye.ui.splash.AnimatedSplashScreen
import com.sahaaye.ui.theme.AppBackground
import com.sahaaye.ui.theme.SahaayeTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SahaayeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = AppBackground
                ) {
                    var currentScreen by remember { mutableStateOf("splash") }
                    var currentLocation by remember { mutableStateOf(SahaayeLocation.DEFAULT) }
                    var activeRadiusKm by remember { mutableStateOf(5.0) }
                    var openNearbyInManualMode by remember { mutableStateOf(false) }
                    var isGpsLoading by remember { mutableStateOf(false) }

                    val coroutineScope = rememberCoroutineScope()
                    val context = this@MainActivity

                    val fetchLiveGpsSilently: () -> Unit = {
                        coroutineScope.launch {
                            val live = LiveLocationService.fetchCurrentLiveLocation(context)
                            if (live != null) {
                                currentLocation = live
                            }
                        }
                    }

                    val fetchLiveGpsExplicitly: () -> Unit = {
                        coroutineScope.launch {
                            isGpsLoading = true
                            Toast.makeText(context, "Fetching location...", Toast.LENGTH_SHORT).show()
                            val live = LiveLocationService.fetchCurrentLiveLocation(context)
                            isGpsLoading = false
                            if (live != null) {
                                currentLocation = live
                            }
                        }
                    }

                    // Request all required project permissions on startup:
                    // Camera, Media (Photos/Videos/Audio), Live Location (GPS), Notifications
                    val permissionLauncher = rememberLauncherForActivityResult(
                        ActivityResultContracts.RequestMultiplePermissions()
                    ) { results ->
                        val fineGranted = results[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
                        val coarseGranted = results[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
                        if (fineGranted || coarseGranted) {
                            fetchLiveGpsSilently()
                        }
                    }

                    // Prompt user for permissions immediately on launch (fetch location silently with NO popup)
                    LaunchedEffect(Unit) {
                        NeedsRepository.initDatabase(context)
                        if (!LiveLocationService.arePermissionsGranted(context)) {
                            permissionLauncher.launch(LiveLocationService.getRequiredPermissions())
                        } else if (LiveLocationService.hasLocationPermission(context)) {
                            fetchLiveGpsSilently()
                        }
                    }

                    BackHandler(enabled = currentScreen != "dashboard" && currentScreen != "splash") {
                        currentScreen = "dashboard"
                    }

                    Crossfade(
                        targetState = currentScreen,
                        animationSpec = tween(500),
                        label = "screenTransition"
                    ) { screen ->
                        when (screen) {
                            "splash" -> {
                                AnimatedSplashScreen(
                                    onSplashFinished = {
                                        currentScreen = "dashboard"
                                    }
                                )
                            }
                            "dashboard" -> {
                                DashboardScreen(
                                    currentLocation = currentLocation,
                                    currentRadiusKm = activeRadiusKm,
                                    onLocationChange = { newLoc ->
                                        currentLocation = newLoc
                                    },
                                    onNavigateToNearby = {
                                        openNearbyInManualMode = false
                                        currentScreen = "nearby"
                                    },
                                    onSelectOnMapClick = {
                                        openNearbyInManualMode = true
                                        currentScreen = "nearby"
                                    },
                                    onLiveLocationClick = {
                                        if (!LiveLocationService.hasLocationPermission(context)) {
                                            permissionLauncher.launch(
                                                arrayOf(
                                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                                )
                                            )
                                        } else {
                                            fetchLiveGpsExplicitly()
                                        }
                                    },
                                    isGpsLoading = isGpsLoading,
                                    onNavigateToReport = {
                                        currentScreen = "report"
                                    },
                                    onNavigateToActivities = {
                                        Toast.makeText(this@MainActivity, "📋 Opening My Activities…", Toast.LENGTH_SHORT).show()
                                    },
                                    onNeedDetailClick = { need: NeedItem ->
                                        Toast.makeText(this@MainActivity, "📌 ${need.title} (${need.distanceKm} km away)", Toast.LENGTH_SHORT).show()
                                    }
                                )
                            }
                            "nearby" -> {
                                NearbyMapScreen(
                                    currentLocation = currentLocation,
                                    initialRadiusKm = activeRadiusKm,
                                    onRadiusChange = { activeRadiusKm = it },
                                    onLocationChange = { newLoc ->
                                        currentLocation = newLoc
                                    },
                                    initialManualMode = openNearbyInManualMode,
                                    onBackClick = {
                                        openNearbyInManualMode = false
                                        currentScreen = "dashboard"
                                    },
                                    onNeedClick = { need: NeedItem ->
                                        Toast.makeText(
                                            this@MainActivity,
                                            "🤝 Connecting you to ${need.title} in ${need.location}",
                                            Toast.LENGTH_LONG
                                        ).show()
                                    }
                                )
                            }
                            "report" -> {
                                ReportNeedScreen(
                                    onBackClick = {
                                        currentScreen = "dashboard"
                                    },
                                    onNeedPublished = { publishedNeed ->
                                        // 1. Add to SQLite database & in-memory community repository
                                        NeedsRepository.addReportedNeed(publishedNeed, this@MainActivity)

                                        // 2. Set active location to the newly reported need so map & dashboard center on it
                                        val reportedLoc = SahaayeLocation(
                                            name = publishedNeed.location,
                                            latitude = publishedNeed.latitude,
                                            longitude = publishedNeed.longitude,
                                            placeType = "Reported Need"
                                        )
                                        currentLocation = reportedLoc

                                        // 3. Immediately navigate to Nearby Explorer where the new need is visible at the captured location!
                                        currentScreen = "nearby"
                                        Toast.makeText(
                                            this@MainActivity,
                                            "Need published & live on map!",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
