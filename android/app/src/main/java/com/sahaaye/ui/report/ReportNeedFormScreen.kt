package com.sahaaye.ui.report

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import android.widget.Toast
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.service.NeedsApiService
import com.sahaaye.ui.theme.*
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportNeedFormScreen(
    capturedPhoto: File,
    capturedLocation: SahaayeLocation,
    onRetakePhoto: () -> Unit,
    onSubmitNeed: (NeedItem) -> Unit,
    onBackClick: () -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("Food") }
    var selectedUrgency by remember { mutableStateOf("Normal") }

    var titleError by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var uploadStatusText by remember { mutableStateOf("Publish Need to Community") }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val categories = listOf(
        Triple("Food", "🍚", BrandPrimary),
        Triple("Medical", "💊", AccentRose),
        Triple("Education", "📚", StatNearby),
        Triple("Shelter", "🏠", StatProgress),
        Triple("Elderly", "👴", StatRating),
        Triple("Others", "🤝", Color(0xFF64748B))
    )

    val urgencies = listOf("Normal", "Urgent", "Emergency")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Report Community Need",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Geo-Verified Community Aid",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardSurface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppBackground)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── 1. Geo-Stamped Photo Preview Card ─────────────────────────────
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(230.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.Black)
                    ) {
                        AsyncImage(
                            model = capturedPhoto,
                            contentDescription = "Geo Stamped Photo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        // Verified Badge overlay
                        Surface(
                            color = Color(0xDD0F172A),
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Geo-Verified",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }

                        // Retake button overlay
                        Surface(
                            color = Color(0xDD0F172A),
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(10.dp)
                                .clickable { onRetakePhoto() }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CameraAlt,
                                    contentDescription = "Retake",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Retake",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Location summary badge
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = BrandPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = capturedLocation.name,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary,
                                maxLines = 1
                            )
                            val latStr = String.format(Locale.US, "%.5f° N, %.5f° E", capturedLocation.latitude, capturedLocation.longitude)
                            Text(
                                text = latStr,
                                fontSize = 10.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }

            // ── 2. Category Selection ─────────────────────────────────────────
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "Category *",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories.forEach { (catName, emoji, color) ->
                            val isSelected = selectedCategory == catName
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) color else BorderLight,
                                border = if (isSelected) null else BorderStroke(1.dp, BorderSubtle),
                                modifier = Modifier.clickable { selectedCategory = catName }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = emoji, fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = catName,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) Color.White else TextPrimary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── 3. Title / Issue (MANDATORY) ──────────────────────────────────
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Title / Issue *",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Mandatory",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (titleError) AccentRose else BrandPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = title,
                        onValueChange = {
                            title = it
                            if (it.trim().isNotEmpty()) titleError = false
                        },
                        placeholder = {
                            Text("e.g. Food packet assistance for 10 people...", fontSize = 13.sp, color = TextMuted)
                        },
                        isError = titleError,
                        supportingText = {
                            if (titleError) {
                                Text("Title is required to submit a report", color = AccentRose, fontSize = 11.sp)
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // ── 4. Description (OPTIONAL) ─────────────────────────────────────
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Description",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Optional",
                            fontSize = 10.sp,
                            color = TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        placeholder = {
                            Text("Add any helpful landmarks, details, or notes (optional)...", fontSize = 13.sp, color = TextMuted)
                        },
                        minLines = 3,
                        maxLines = 5,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // ── 5. Urgency Level ──────────────────────────────────────────────
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "Urgency Level",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        urgencies.forEach { urg ->
                            val isSelected = selectedUrgency == urg
                            val color = when (urg) {
                                "Emergency" -> AccentRose
                                "Urgent" -> Color(0xFFF59E0B)
                                else -> BrandPrimary
                            }
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) color.copy(alpha = 0.15f) else BorderLight,
                                border = BorderStroke(1.dp, if (isSelected) color else BorderSubtle),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { selectedUrgency = urg }
                            ) {
                                Box(
                                    modifier = Modifier.padding(vertical = 9.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = urg,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) color else TextPrimary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ── 6. Server Destination & Verification Notice ───────────────────
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = CardSurface,
                border = BorderStroke(1.dp, BorderLight),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Server Sync: Active (Uploading to Sahaaye Cloud / ${capturedLocation.name.take(24)}…)",
                        fontSize = 11.sp,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ── 7. Submit Button with Direct Cloud Upload ─────────────────────
            Button(
                onClick = {
                    if (title.trim().isEmpty()) {
                        titleError = true
                        return@Button
                    }
                    isSubmitting = true
                    uploadStatusText = "Uploading photo & geo-coordinates to server…"

                    coroutineScope.launch {
                        val selectedCatInfo = categories.find { it.first == selectedCategory } ?: categories.first()

                        // Call backend server (POST /api/v1/needs)
                        val uploadResult = NeedsApiService.uploadReportedNeed(
                            photoFile = capturedPhoto,
                            title = title.trim(),
                            description = description.trim(),
                            category = selectedCategory,
                            urgency = selectedUrgency,
                            latitude = capturedLocation.latitude,
                            longitude = capturedLocation.longitude,
                            location = capturedLocation.name
                        )

                        val finalNeed = if (uploadResult.isSuccess) {
                            val serverResponse = uploadResult.getOrNull()!!
                            Toast.makeText(
                                context,
                                "✓ Uploaded to Sahaaye Server successfully!",
                                Toast.LENGTH_LONG
                            ).show()

                            NeedItem(
                                id = serverResponse.id,
                                title = serverResponse.title,
                                location = serverResponse.location,
                                timeAgo = "Just now",
                                category = serverResponse.category,
                                emoji = selectedCatInfo.second,
                                latitude = serverResponse.latitude,
                                longitude = serverResponse.longitude,
                                distanceKm = 0.0,
                                tagColor = selectedCatInfo.third,
                                tagBg = selectedCatInfo.third.copy(alpha = 0.15f),
                                description = serverResponse.description,
                                imagePath = capturedPhoto.absolutePath,
                                isUserReported = true,
                                urgency = serverResponse.urgency
                            )
                        } else {
                            val errorMsg = uploadResult.exceptionOrNull()?.message ?: "Server unreachable"
                            Toast.makeText(
                                context,
                                "Report saved locally. (Offline sync active: $errorMsg)",
                                Toast.LENGTH_LONG
                            ).show()

                            NeedItem(
                                id = "user_need_${System.currentTimeMillis()}",
                                title = title.trim(),
                                location = capturedLocation.name,
                                timeAgo = "Just now",
                                category = selectedCategory,
                                emoji = selectedCatInfo.second,
                                latitude = capturedLocation.latitude,
                                longitude = capturedLocation.longitude,
                                distanceKm = 0.0,
                                tagColor = selectedCatInfo.third,
                                tagBg = selectedCatInfo.third.copy(alpha = 0.15f),
                                description = description.trim(),
                                imagePath = capturedPhoto.absolutePath,
                                isUserReported = true,
                                urgency = selectedUrgency
                            )
                        }

                        isSubmitting = false
                        uploadStatusText = "Publish Need to Community"
                        onSubmitNeed(finalNeed)
                    }
                },
                enabled = !isSubmitting,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Uploading to Server…",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                } else {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Publish",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Publish Need to Community",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

