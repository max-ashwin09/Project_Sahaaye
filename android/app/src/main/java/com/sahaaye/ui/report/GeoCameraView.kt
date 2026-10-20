package com.sahaaye.ui.report

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.sahaaye.data.model.SahaayeLocation
import com.sahaaye.data.service.LiveLocationService
import com.sahaaye.ui.theme.*
import com.sahaaye.util.GeoCameraHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@Composable
fun GeoCameraView(
    onPhotoCaptured: (file: File, location: SahaayeLocation) -> Unit,
    onCloseClick: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    // Camera Configuration States
    var lensFacing by remember { mutableStateOf(CameraSelector.LENS_FACING_BACK) }
    var flashMode by remember { mutableStateOf(ImageCapture.FLASH_MODE_AUTO) }
    var showGrid by remember { mutableStateOf(true) }
    var isCapturing by remember { mutableStateOf(false) }

    // Tap to Focus State & Animation
    var focusPoint by remember { mutableStateOf<Offset?>(null) }
    var focusAnimTrigger by remember { mutableStateOf(0) }

    // Zoom State
    var currentZoomRatio by remember { mutableStateOf(1f) }
    var maxZoomRatio by remember { mutableStateOf(5f) }
    var showZoomIndicator by remember { mutableStateOf(false) }

    // GPS Location State
    var activeLocation by remember { mutableStateOf<SahaayeLocation?>(null) }
    var isFetchingGps by remember { mutableStateOf(true) }

    // Live clock for viewfinder
    var currentTimeString by remember {
        mutableStateOf(SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault()).format(Date()))
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            currentTimeString = SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault()).format(Date())
        }
    }

    // Function to acquire live GPS coordinates
    val refreshLocation: () -> Unit = {
        coroutineScope.launch {
            isFetchingGps = true
            val loc = LiveLocationService.fetchCurrentLiveLocation(context)
            isFetchingGps = false
            if (loc != null) {
                activeLocation = loc
            }
        }
    }

    // Permission launcher for Location + Camera
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val cameraGranted = results[Manifest.permission.CAMERA] ?: false
        val locGranted = (results[Manifest.permission.ACCESS_FINE_LOCATION] ?: false) ||
                (results[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false)

        if (!cameraGranted) {
            Toast.makeText(context, "Camera permission is required", Toast.LENGTH_SHORT).show()
            onCloseClick()
        } else if (locGranted) {
            refreshLocation()
        }
    }

    LaunchedEffect(Unit) {
        val hasCamera = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        val hasLoc = LiveLocationService.hasLocationPermission(context)
        if (!hasCamera || !hasLoc) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.CAMERA,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else {
            refreshLocation()
        }
    }

    // CameraX Objects
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    var previewViewRef by remember { mutableStateOf<PreviewView?>(null) }
    var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
    var cameraControl: CameraControl? by remember { mutableStateOf(null) }
    var cameraInfo: CameraInfo? by remember { mutableStateOf(null) }

    // Shutter flash visual blink effect
    var showShutterBlink by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── 1. Smooth Hardware-Accelerated CameraX Viewfinder ───────────────
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    // PERFORMANCE mode uses SurfaceView for silky smooth 60-120 FPS!
                    implementationMode = PreviewView.ImplementationMode.PERFORMANCE
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    previewViewRef = this
                }
            },
            update = { previewView ->
                val cameraProviderFuture = ProcessCameraProvider.getInstance(previewView.context)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val capture = ImageCapture.Builder()
                        .setFlashMode(flashMode)
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    imageCapture = capture

                    val cameraSelector = CameraSelector.Builder()
                        .requireLensFacing(lensFacing)
                        .build()

                    try {
                        cameraProvider.unbindAll()
                        val camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            capture
                        )
                        cameraControl = camera.cameraControl
                        cameraInfo = camera.cameraInfo

                        camera.cameraInfo.zoomState.observe(lifecycleOwner) { zoomState ->
                            currentZoomRatio = zoomState.zoomRatio
                            maxZoomRatio = zoomState.maxZoomRatio.coerceAtMost(6f)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }, ContextCompat.getMainExecutor(previewView.context))
            },
            modifier = Modifier.fillMaxSize()
        )

        // ── 2. Tap to Focus & Pinch to Zoom Gesture Overlay ─────────────────
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(previewViewRef, lensFacing) {
                    detectTransformGestures { _, _, zoom, _ ->
                        val targetZoom = (currentZoomRatio * zoom).coerceIn(1f, maxZoomRatio)
                        cameraControl?.setZoomRatio(targetZoom)
                        showZoomIndicator = true
                    }
                }
                .pointerInput(previewViewRef, lensFacing) {
                    detectTapGestures { offset ->
                        val preview = previewViewRef ?: return@detectTapGestures
                        val factory = preview.meteringPointFactory
                        val point = factory.createPoint(offset.x, offset.y)
                        val action = FocusMeteringAction.Builder(
                            point,
                            FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE
                        )
                            .setAutoCancelDuration(3, TimeUnit.SECONDS)
                            .build()

                        cameraControl?.startFocusAndMetering(action)
                        focusPoint = offset
                        focusAnimTrigger++
                    }
                }
        )

        // ── 3. Rule of Thirds 3x3 Grid Overlay ──────────────────────────────
        if (showGrid) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val gridColor = Color.White.copy(alpha = 0.22f)
                val strokeW = 1.dp.toPx()

                drawLine(gridColor, Offset(w / 3f, 0f), Offset(w / 3f, h), strokeWidth = strokeW)
                drawLine(gridColor, Offset(2 * w / 3f, 0f), Offset(2 * w / 3f, h), strokeWidth = strokeW)
                drawLine(gridColor, Offset(0f, h / 3f), Offset(w, h / 3f), strokeWidth = strokeW)
                drawLine(gridColor, Offset(0f, 2 * h / 3f), Offset(w, 2 * h / 3f), strokeWidth = strokeW)
            }
        }

        // ── 4. Professional Focus Indicator (Yellow Box with Brackets) ───────
        focusPoint?.let { pos ->
            val scaleAnim = remember(focusAnimTrigger) { Animatable(1.35f) }
            val alphaAnim = remember(focusAnimTrigger) { Animatable(1f) }

            LaunchedEffect(focusAnimTrigger) {
                scaleAnim.animateTo(
                    1.0f,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
                )
                delay(1600)
                alphaAnim.animateTo(0f, animationSpec = tween(400))
                focusPoint = null
            }

            Box(
                modifier = Modifier
                    .offset(x = (pos.x - 36).dp, y = (pos.y - 36).dp)
                    .size(72.dp)
                    .scale(scaleAnim.value)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val color = Color(0xFFFBBF24).copy(alpha = alphaAnim.value)
                    val strokeWidth = 2.dp.toPx()
                    val cornerLen = 14.dp.toPx()
                    val w = size.width
                    val h = size.height

                    // Top-Left
                    drawLine(color, Offset(0f, 0f), Offset(cornerLen, 0f), strokeWidth)
                    drawLine(color, Offset(0f, 0f), Offset(0f, cornerLen), strokeWidth)
                    // Top-Right
                    drawLine(color, Offset(w, 0f), Offset(w - cornerLen, 0f), strokeWidth)
                    drawLine(color, Offset(w, 0f), Offset(w, cornerLen), strokeWidth)
                    // Bottom-Left
                    drawLine(color, Offset(0f, h), Offset(cornerLen, h), strokeWidth)
                    drawLine(color, Offset(0f, h), Offset(0f, h - cornerLen), strokeWidth)
                    // Bottom-Right
                    drawLine(color, Offset(w, h), Offset(w - cornerLen, h), strokeWidth)
                    drawLine(color, Offset(w, h), Offset(w, h - cornerLen), strokeWidth)
                }
            }
        }

        // ── 5. Zoom Level Indicator Pill ─────────────────────────────────────
        AnimatedVisibility(
            visible = showZoomIndicator,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.Center)
                .padding(bottom = 140.dp)
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.65f),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
            ) {
                Text(
                    text = String.format(Locale.US, "%.1fx", currentZoomRatio),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
            LaunchedEffect(showZoomIndicator) {
                delay(2000)
                showZoomIndicator = false
            }
        }

        // ── 6. Shutter Blink Screen Flash Effect ─────────────────────────────
        if (showShutterBlink) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.85f))
            )
        }

        // ── 7. Top Camera Controls Bar ───────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Close / Back button
            Surface(
                color = Color.Black.copy(alpha = 0.55f),
                shape = CircleShape,
                modifier = Modifier
                    .size(42.dp)
                    .clickable { onCloseClick() }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            // Right Action Controls
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Flash Toggle (Auto / On / Off)
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    modifier = Modifier
                        .size(42.dp)
                        .clickable {
                            flashMode = when (flashMode) {
                                ImageCapture.FLASH_MODE_AUTO -> ImageCapture.FLASH_MODE_ON
                                ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_OFF
                                else -> ImageCapture.FLASH_MODE_AUTO
                            }
                            imageCapture?.flashMode = flashMode
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        val icon = when (flashMode) {
                            ImageCapture.FLASH_MODE_ON -> Icons.Default.FlashOn
                            ImageCapture.FLASH_MODE_OFF -> Icons.Default.FlashOff
                            else -> Icons.Default.FlashAuto
                        }
                        val tint = if (flashMode != ImageCapture.FLASH_MODE_OFF) Color(0xFFFBBF24) else Color.White
                        Icon(imageVector = icon, contentDescription = "Flash", tint = tint, modifier = Modifier.size(20.dp))
                    }
                }

                // Grid Toggle (3x3)
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    modifier = Modifier
                        .size(42.dp)
                        .clickable { showGrid = !showGrid }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (showGrid) Icons.Default.GridOn else Icons.Default.GridOff,
                            contentDescription = "Grid",
                            tint = if (showGrid) Color(0xFF38BDF8) else Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Camera Flip (Front / Back)
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    modifier = Modifier
                        .size(42.dp)
                        .clickable {
                            lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
                                CameraSelector.LENS_FACING_FRONT
                            } else {
                                CameraSelector.LENS_FACING_BACK
                            }
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Cameraswitch,
                            contentDescription = "Switch Camera",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // ── 8. Bottom Viewfinder: Live Geo-Stamp Overlay & Shutter Button ────
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ── Live Geo-Stamp Viewfinder Card ──────────────────────────────
            Surface(
                color = Color(0xDD0F172A),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    // Header line with status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val dotColor = if (activeLocation != null) Color(0xFF10B981) else Color(0xFFF59E0B)
                            Box(
                                modifier = Modifier
                                    .size(9.dp)
                                    .clip(CircleShape)
                                    .background(dotColor)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (activeLocation != null) "GPS LOCKED & READY" else if (isFetchingGps) "ACQUIRING GPS LOCK…" else "GPS REQUIRED",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = dotColor,
                                letterSpacing = 0.5.sp
                            )
                        }

                        if (activeLocation == null || isFetchingGps) {
                            Surface(
                                color = Color.White.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { refreshLocation() }
                            ) {
                                Text(
                                    text = "Retry GPS ↻",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Address / Locality
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = Color(0xFF60A5FA),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = activeLocation?.name ?: "Detecting physical address…",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Coordinates & Time
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val coordsText = if (activeLocation != null) {
                            String.format(
                                Locale.US,
                                "%.5f° N, %.5f° E",
                                activeLocation!!.latitude,
                                activeLocation!!.longitude
                            )
                        } else "Waiting for coordinates…"

                        Text(
                            text = coordsText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF94A3B8)
                        )

                        Text(
                            text = currentTimeString.split(",").lastOrNull()?.trim() ?: "",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF94A3B8)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // ── Shutter Button Row ──────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Spacer for layout balance
                Spacer(modifier = Modifier.size(48.dp))

                val isGpsReady = activeLocation != null

                // Big Geo-Camera Shutter Button
                Surface(
                    shape = CircleShape,
                    color = if (isGpsReady) Color.White else Color(0xFF475569),
                    border = BorderStroke(
                        4.dp,
                        if (isGpsReady) Color(0xFF2563EB) else Color(0xFF94A3B8)
                    ),
                    modifier = Modifier
                        .size(78.dp)
                        .clickable(enabled = !isCapturing) {
                            // MANDATORY GPS CHECK
                            if (activeLocation == null) {
                                Toast.makeText(
                                    context,
                                    "GPS Location is mandatory to capture geo-verified need photo.",
                                    Toast.LENGTH_LONG
                                ).show()
                                refreshLocation()
                                return@clickable
                            }

                            val capture = imageCapture ?: return@clickable
                            isCapturing = true
                            showShutterBlink = true

                            // Save raw photo directly into raw_data/non_blurry directory
                            val nonBlurryDir = GeoCameraHelper.getRawDataNonBlurryDir(context)
                            val tempFile = File(nonBlurryDir, "raw_capture_${System.currentTimeMillis()}.jpg")
                            val outputOptions = ImageCapture.OutputFileOptions.Builder(tempFile).build()

                            capture.takePicture(
                                outputOptions,
                                cameraExecutor,
                                object : ImageCapture.OnImageSavedCallback {
                                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                        coroutineScope.launch {
                                            showShutterBlink = false
                                            // Burn official Geo-Stamp watermark onto the photo
                                            val stampedFile = GeoCameraHelper.stampGeoDetailsOnImage(
                                                context = context,
                                                rawImageFile = tempFile,
                                                latitude = activeLocation!!.latitude,
                                                longitude = activeLocation!!.longitude,
                                                locationName = activeLocation!!.name
                                            )
                                            isCapturing = false
                                            onPhotoCaptured(stampedFile, activeLocation!!)
                                        }
                                    }

                                    override fun onError(exception: ImageCaptureException) {
                                        coroutineScope.launch {
                                            showShutterBlink = false
                                            isCapturing = false
                                            Toast.makeText(context, "Capture error: ${exception.message}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isCapturing) {
                            CircularProgressIndicator(
                                color = Color(0xFF2563EB),
                                strokeWidth = 3.dp,
                                modifier = Modifier.size(34.dp)
                            )
                        } else if (!isGpsReady) {
                            Icon(
                                imageVector = Icons.Default.LocationOff,
                                contentDescription = "GPS Required",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(62.dp)
                                    .clip(CircleShape)
                                    .background(Color.White)
                                    .border(2.dp, Color(0xFF0F172A), CircleShape)
                            )
                        }
                    }
                }

                // Right Info/Status Button
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isGpsReady) Icons.Default.GpsFixed else Icons.Default.GpsNotFixed,
                            contentDescription = "GPS Status",
                            tint = if (isGpsReady) Color(0xFF10B981) else Color(0xFFF59E0B),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
        }
    }
}
