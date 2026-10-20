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
import com.sahaaye.data.service.LiveLocationService
import com.sahaaye.ui.dashboard.DashboardScreen
import com.sahaaye.ui.nearby.NearbyMapScreen
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

                    val fetchLiveGps: () -> Unit = {
                        coroutineScope.launch {
                            isGpsLoading = true
                            Toast.makeText(context, "📡 Accessing GPS & fetching live location...", Toast.LENGTH_SHORT).show()
                            val live = LiveLocationService.fetchCurrentLiveLocation(context)
                            isGpsLoading = false
                            if (live != null) {
                                currentLocation = live
                                Toast.makeText(context, "📍 Real GPS: ${live.name}", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Could not fetch GPS. Please check location settings.", Toast.LENGTH_SHORT).show()
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
                            fetchLiveGps()
                        }
                    }

                    // Prompt user for permissions immediately on launch
                    LaunchedEffect(Unit) {
                        if (!LiveLocationService.arePermissionsGranted(context)) {
                            permissionLauncher.launch(LiveLocationService.getRequiredPermissions())
                        } else if (LiveLocationService.hasLocationPermission(context)) {
                            fetchLiveGps()
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
                                        Toast.makeText(this@MainActivity, "📍 Location: ${newLoc.name}", Toast.LENGTH_SHORT).show()
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
                                            fetchLiveGps()
                                        }
                                    },
                                    isGpsLoading = isGpsLoading,
                                    onNavigateToReport = {
                                        Toast.makeText(this@MainActivity, "➕ Opening Report Need Form…", Toast.LENGTH_SHORT).show()
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
                                        Toast.makeText(this@MainActivity, "📍 Set Location: ${newLoc.name}", Toast.LENGTH_SHORT).show()
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
                        }
                    }
                }
            }
        }
    }
}
