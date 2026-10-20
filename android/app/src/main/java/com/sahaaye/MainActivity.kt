package com.sahaaye

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.ui.dashboard.DashboardScreen
import com.sahaaye.ui.nearby.NearbyMapScreen
import com.sahaaye.ui.splash.AnimatedSplashScreen
import com.sahaaye.ui.theme.AppBackground
import com.sahaaye.ui.theme.SahaayeTheme

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
