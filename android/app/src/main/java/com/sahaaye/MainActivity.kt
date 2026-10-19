package com.sahaaye

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sahaaye.data.model.NeedItem
import com.sahaaye.ui.dashboard.DashboardScreen
import com.sahaaye.ui.nearby.NearbyMapScreen
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
                    var currentScreen by remember { mutableStateOf("dashboard") }

                    BackHandler(enabled = currentScreen != "dashboard") {
                        currentScreen = "dashboard"
                    }

                    when (currentScreen) {
                        "dashboard" -> {
                            DashboardScreen(
                                onNavigateToNearby = {
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
                                onBackClick = {
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
