package com.sahaaye.ui.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.R
import com.sahaaye.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun AnimatedSplashScreen(
    onSplashFinished: () -> Unit
) {
    // Animation drivers - start partially visible so there is zero white flash
    val scaleAnim = remember { Animatable(0.75f) }
    val alphaAnim = remember { Animatable(0.4f) }
    val textAlphaAnim = remember { Animatable(0.2f) }

    // Pulsing background circle animation
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseScale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseAlpha"
    )

    LaunchedEffect(Unit) {
        // Run animations concurrently
        launch {
            alphaAnim.animateTo(1f, animationSpec = tween(400))
        }
        launch {
            scaleAnim.animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessLow
                )
            )
        }
        launch {
            delay(150)
            textAlphaAnim.animateTo(1f, animationSpec = tween(500))
        }

        // Hold splash screen for 2.2 seconds so user sees the animated logo
        delay(2200)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF0FDF4), // Emerald tint
                        Color(0xFFEFF6FF), // Soft Blue tint
                        Color(0xFFFFFFFF)  // Pure White
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo Container with Pulsing Halo
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(180.dp)
            ) {
                // Outer Pulse Ring
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(pulseScale)
                        .alpha(pulseAlpha)
                        .background(BrandPrimary, CircleShape)
                )

                // Outer Soft Card Surface
                Surface(
                    shape = RoundedCornerShape(32.dp),
                    color = Color.White,
                    shadowElevation = 12.dp,
                    modifier = Modifier
                        .size(116.dp)
                        .scale(scaleAnim.value)
                        .alpha(alphaAnim.value)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.sahaaye_icon),
                            contentDescription = "SAHAAYE Logo",
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Animated Brand Title
            Text(
                text = "SAHAAYE",
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = BrandPrimary,
                letterSpacing = 2.sp,
                modifier = Modifier
                    .scale(scaleAnim.value)
                    .alpha(alphaAnim.value)
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Animated Slogan
            Text(
                text = "People Help People",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                letterSpacing = 0.5.sp,
                modifier = Modifier.alpha(textAlphaAnim.value)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Tagline Pill
            Surface(
                color = BrandPrimaryLight,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.alpha(textAlphaAnim.value)
            ) {
                Text(
                    text = "A Privacy-Preserving Humanitarian Aid Platform",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = BrandPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        // Bottom Loader Indicator
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val dotScale by infiniteTransition.animateFloat(
                    initialValue = 0.6f,
                    targetValue = 1.2f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(600, easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "dot"
                )
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .scale(dotScale)
                        .background(BrandPrimary, CircleShape)
                )
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(BrandPrimary.copy(alpha = 0.6f), CircleShape)
                )
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(BrandPrimary.copy(alpha = 0.3f), CircleShape)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Connecting Help With Hope",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )
        }
    }
}
