package com.sahaaye.ui.location

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.repository.NeedsRepository
import com.sahaaye.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationSearchBottomSheet(
    currentLocation: SahaayeLocation,
    onLocationSelected: (SahaayeLocation) -> Unit,
    onSelectOnMapClick: () -> Unit,
    onDismissRequest: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val allLocations = remember { SahaayeLocation.SAMPLE_LOCATIONS }

    val filteredLocations = remember(searchQuery) {
        if (searchQuery.trim().isEmpty()) {
            allLocations
        } else {
            val q = searchQuery.trim().lowercase()
            allLocations.filter { loc ->
                loc.name.lowercase().contains(q) ||
                loc.fullAddress.lowercase().contains(q) ||
                loc.locality.lowercase().contains(q) ||
                loc.placeType.lowercase().contains(q)
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = CardSurface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 8.dp)
                    .width(44.dp)
                    .height(4.dp)
                    .background(BorderSubtle, CircleShape)
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header: Title & Close Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Choose Your Location",
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Search gali, mohalla, colony or select on map",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }

                IconButton(
                    onClick = onDismissRequest,
                    modifier = Modifier
                        .size(36.dp)
                        .background(BorderLight, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Google Maps-style Search Input Box
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = {
                    Text(
                        text = "Search area, street, landmark…",
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = BrandPrimary
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Clear",
                                tint = TextSecondary
                            )
                        }
                    }
                },
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandPrimary,
                    unfocusedBorderColor = BorderSubtle,
                    focusedContainerColor = Color(0xFFF8FAFC),
                    unfocusedContainerColor = Color(0xFFF8FAFC)
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Quick Actions: [Use Current Location] & [Select on Map]
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Use Current Location (GPS)
                Surface(
                    color = BrandPrimaryLight,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            onLocationSelected(SahaayeLocation.DEFAULT)
                            onDismissRequest()
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .background(BrandPrimary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.MyLocation,
                                contentDescription = "GPS",
                                tint = TextInverted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Current GPS",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandPrimary
                            )
                            Text(
                                text = "Using Device GPS",
                                fontSize = 10.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }

                // Choose on Map
                Surface(
                    color = BorderLight,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            onDismissRequest()
                            onSelectOnMapClick()
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .background(StatNearby, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Map,
                                contentDescription = "Map",
                                tint = TextInverted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Choose on Map",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Drag & Drop Pin",
                                fontSize = 10.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Suggestions List Heading
            Text(
                text = if (searchQuery.isNotEmpty()) "SEARCH RESULTS" else "POPULAR LOCALITIES IN INDORE",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 0.8.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Detailed Results List
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 380.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // If user entered a custom query not in list, provide dynamic option
                if (searchQuery.trim().isNotEmpty() && filteredLocations.none { it.name.equals(searchQuery.trim(), ignoreCase = true) }) {
                    item {
                        Surface(
                            color = BrandPrimaryLight.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, BrandPrimary.copy(alpha = 0.3f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val customLoc = SahaayeLocation(
                                        id = "custom_${System.currentTimeMillis()}",
                                        name = searchQuery.trim(),
                                        fullAddress = "${searchQuery.trim()}, Indore, Madhya Pradesh",
                                        locality = "Custom Location",
                                        latitude = 22.7196 + (Math.random() - 0.5) * 0.04,
                                        longitude = 75.8577 + (Math.random() - 0.5) * 0.04,
                                        placeType = "Custom"
                                    )
                                    onLocationSelected(customLoc)
                                    onDismissRequest()
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(BrandPrimary, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Search,
                                        contentDescription = "Search",
                                        tint = TextInverted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Search \"${searchQuery.trim()}\"",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BrandPrimary
                                    )
                                    Text(
                                        text = "Use this exact address in Indore, MP",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }

                items(filteredLocations) { loc ->
                    val isSelected = loc.id == currentLocation.id || loc.name == currentLocation.name
                    val distKm = NeedsRepository.calculateDistance(
                        currentLocation.latitude, currentLocation.longitude,
                        loc.latitude, loc.longitude
                    )

                    Surface(
                        color = if (isSelected) BrandPrimaryLight else CardSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, if (isSelected) BrandPrimary else BorderSubtle),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onLocationSelected(loc)
                                onDismissRequest()
                            }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Location Icon Pin
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(
                                        if (isSelected) BrandPrimary else BorderLight,
                                        CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isSelected) Icons.Default.Check else Icons.Default.LocationOn,
                                    contentDescription = "Location",
                                    tint = if (isSelected) TextInverted else BrandPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            // Details: Name, Gali/Colony/Full Address
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = loc.name,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) BrandPrimary else TextPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Surface(
                                        color = BorderLight,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = loc.placeType,
                                            fontSize = 9.sp,
                                            color = TextSecondary,
                                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(2.dp))

                                Text(
                                    text = loc.fullAddress,
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    lineHeight = 15.sp
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "📍 ${loc.locality}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                    if (distKm > 0.0) {
                                        Text(
                                            text = " • $distKm km away",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = StatNearby
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
