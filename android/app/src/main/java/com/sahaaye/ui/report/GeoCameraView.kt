package com.sahaaye.ui.report

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Environment
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.video.VideoCapture
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
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
import kotlin.math.roundToInt

enum class CameraCaptureMode {
    PHOTO,
    VIDEO
}

@Composable
fun GeoCameraView(
    onMediaCaptured: (files: List<File>, location: SahaayeLocation) -> Unit,
    onCloseClick: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()
    val density = LocalDensity.current

    // Captured Media Gallery List (Stacked in Bottom-Left corner)
    val capturedMediaList = remember { mutableStateListOf<File>() }

    // Mode: PHOTO vs VIDEO
    var captureMode by remember { mutableStateOf(CameraCaptureMode.PHOTO) }

    // Camera Configuration States
    var lensFacing by remember { mutableStateOf(CameraSelector.LENS_FACING_BACK) }
    var isTorchOn by remember { mutableStateOf(false) }
    var showGrid by remember { mutableStateOf(true) }
    var isCapturing by remember { mutableStateOf(false) }

    // Video Recording State
    var isRecording by remember { mutableStateOf(false) }
    var recordingDurationSeconds by remember { mutableStateOf(0) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }

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

    // Video recording duration timer
    LaunchedEffect(isRecording) {
        if (isRecording) {
            recordingDurationSeconds = 0
            while (isRecording) {
                delay(1000)
                recordingDurationSeconds++
            }
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

    // Permission launcher for Location + Camera + Audio
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
        val hasAudio = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

        if (!hasCamera || !hasLoc || !hasAudio) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
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
    var videoCapture: VideoCapture<Recorder>? by remember { mutableStateOf(null) }
    var cameraControl: CameraControl? by remember { mutableStateOf(null) }
    var cameraInfo: CameraInfo? by remember { mutableStateOf(null) }

    // Dedicated Camera Lifecycle Binding (Runs ONLY when mode or lensFacing changes)
    LaunchedEffect(previewViewRef, lensFacing, captureMode) {
        val previewView = previewViewRef ?: return@LaunchedEffect
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)

        cameraProviderFuture.addListener({
            try {
                val cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                val cameraSelector = CameraSelector.Builder()
                    .requireLensFacing(lensFacing)
                    .build()

                cameraProvider.unbindAll()

                if (captureMode == CameraCaptureMode.PHOTO) {
                    val capture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()
                    imageCapture = capture
                    videoCapture = null

                    val camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        capture
                    )
                    cameraControl = camera.cameraControl
                    cameraInfo = camera.cameraInfo

                    // Apply current torch state
                    try {
                        camera.cameraControl.enableTorch(isTorchOn)
                    } catch (_: Exception) {}

                    camera.cameraInfo.zoomState.observe(lifecycleOwner) { zoomState ->
                        currentZoomRatio = zoomState.zoomRatio
                        maxZoomRatio = zoomState.maxZoomRatio.coerceAtMost(6f)
                    }
                } else {
                    // Video Mode
                    val recorder = Recorder.Builder()
                        .setQualitySelector(QualitySelector.from(Quality.HD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
                        .build()
                    val videoCap = VideoCapture.withOutput(recorder)
                    videoCapture = videoCap
                    imageCapture = null

                    val camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        videoCap
                    )
                    cameraControl = camera.cameraControl
                    cameraInfo = camera.cameraInfo

                    try {
                        camera.cameraControl.enableTorch(isTorchOn)
                    } catch (_: Exception) {}

                    camera.cameraInfo.zoomState.observe(lifecycleOwner) { zoomState ->
                        currentZoomRatio = zoomState.zoomRatio
                        maxZoomRatio = zoomState.maxZoomRatio.coerceAtMost(6f)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(context))
    }

    // Smooth Hardware Torch Control without restarting camera
    LaunchedEffect(isTorchOn, cameraControl) {
        try {
            cameraControl?.enableTorch(isTorchOn)
        } catch (_: Exception) {}
    }

    // Video Recording Functions
    fun startVideoRecording() {
        val capture = videoCapture ?: return
        if (activeLocation == null) {
            Toast.makeText(context, "GPS Location is required for geo-verification", Toast.LENGTH_SHORT).show()
            refreshLocation()
            return
        }

        val nonBlurryDir = GeoCameraHelper.getRawDataNonBlurryDir(context)
        val videoFile = File(nonBlurryDir, "need_video_${System.currentTimeMillis()}.mp4")
        val outputOptions = FileOutputOptions.Builder(videoFile).build()

        val pending = capture.output.prepareRecording(context, outputOptions)
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            pending.withAudioEnabled()
        }

        val recording = pending.start(ContextCompat.getMainExecutor(context)) { event ->
            when (event) {
                is VideoRecordEvent.Start -> {
                    isRecording = true
                }
                is VideoRecordEvent.Finalize -> {
                    isRecording = false
                    if (!event.hasError()) {
                        try {
                            val pubDir = File(
                                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                                "Sahaaye/raw_data/non_blurry"
                            ).apply { mkdirs() }
                            val pubFile = File(pubDir, videoFile.name)
                            videoFile.copyTo(pubFile, overwrite = true)
                        } catch (_: Exception) {}

                        // Add video to captured stack in bottom-left corner!
                        capturedMediaList.add(videoFile)
                        Toast.makeText(context, "Video added (${capturedMediaList.size})", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Video recording failed: ${event.error}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
        activeRecording = recording
    }

    fun stopVideoRecording() {
        activeRecording?.stop()
        activeRecording = null
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── 1. Smooth Hardware-Accelerated CameraX Viewfinder ───────────────
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.PERFORMANCE
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    previewViewRef = this
                }
            },
            update = { /* Stable preview view */ },
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

        // ── 4. Realistic Phone Camera Focus Circle & Exposure Adjustment ────
        focusPoint?.let { pos ->
            val ringDiameterDp = 76.dp
            val ringDiameterPx = with(density) { ringDiameterDp.toPx() }
            val scaleAnim = remember(focusAnimTrigger) { Animatable(1.35f) }
            val alphaAnim = remember(focusAnimTrigger) { Animatable(1f) }

            LaunchedEffect(focusAnimTrigger) {
                scaleAnim.animateTo(
                    1.0f,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
                )
                delay(2200)
                alphaAnim.animateTo(0f, animationSpec = tween(350))
                focusPoint = null
            }

            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (pos.x - ringDiameterPx / 2f).roundToInt(),
                            (pos.y - ringDiameterPx / 2f).roundToInt()
                        )
                    }
                    .size(ringDiameterDp)
                    .scale(scaleAnim.value)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val color = Color(0xFFFBBF24).copy(alpha = alphaAnim.value)
                    val strokeWidth = 2.dp.toPx()
                    val radius = (size.minDimension / 2f) - strokeWidth

                    // Circular Focus Ring
                    drawCircle(
                        color = color,
                        radius = radius,
                        style = Stroke(width = strokeWidth)
                    )

                    // 4 Alignment Notches at 0, 90, 180, 270 degrees
                    val tickLen = 6.dp.toPx()
                    val center = Offset(size.width / 2f, size.height / 2f)
                    drawLine(color, Offset(center.x, center.y - radius), Offset(center.x, center.y - radius + tickLen), strokeWidth)
                    drawLine(color, Offset(center.x, center.y + radius), Offset(center.x, center.y + radius - tickLen), strokeWidth)
                    drawLine(color, Offset(center.x - radius, center.y), Offset(center.x - radius + tickLen, center.y), strokeWidth)
                    drawLine(color, Offset(center.x + radius, center.y), Offset(center.x + radius - tickLen, center.y), strokeWidth)
                }

                // Tiny Sun Icon for Exposure Adjustment
                Icon(
                    imageVector = Icons.Default.WbSunny,
                    contentDescription = "Exposure",
                    tint = Color(0xFFFBBF24).copy(alpha = alphaAnim.value),
                    modifier = Modifier
                        .size(16.dp)
                        .align(Alignment.CenterEnd)
                        .offset(x = 18.dp)
                )
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

        // ── 6. Live Video Recording Badge (Top Center) ──────────────────────
        if (isRecording) {
            val mins = recordingDurationSeconds / 60
            val secs = recordingDurationSeconds % 60
            val timeFormatted = String.format(Locale.US, "%02d:%02d", mins, secs)

            val infiniteTransition = rememberInfiniteTransition(label = "pulse")
            val blinkAlpha by infiniteTransition.animateFloat(
                initialValue = 1f,
                targetValue = 0.2f,
                animationSpec = infiniteRepeatable(
                    animation = tween(600, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "blink"
            )

            Surface(
                color = Color.Black.copy(alpha = 0.75f),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, Color(0xFFEF4444)),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(top = 18.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEF4444).copy(alpha = blinkAlpha))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "REC $timeFormatted",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        // ── 7. Top Bar: Controls (Close, Flashlight/Torch, Grid, Flip) ────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Close Button
            Surface(
                color = Color.Black.copy(alpha = 0.55f),
                shape = CircleShape,
                modifier = Modifier
                    .size(42.dp)
                    .clickable {
                        if (isRecording) {
                            stopVideoRecording()
                        }
                        onCloseClick()
                    }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(22.dp))
                }
            }

            // Quick Control Pills
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // Flashlight / Torch Toggle
                Surface(
                    color = if (isTorchOn) Color(0xFFFBBF24).copy(alpha = 0.25f) else Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    border = if (isTorchOn) BorderStroke(1.5.dp, Color(0xFFFBBF24)) else null,
                    modifier = Modifier
                        .size(42.dp)
                        .clickable {
                            isTorchOn = !isTorchOn
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isTorchOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                            contentDescription = "Flashlight",
                            tint = if (isTorchOn) Color(0xFFFBBF24) else Color.White,
                            modifier = Modifier.size(20.dp)
                        )
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
                            if (!isRecording) {
                                isTorchOn = false
                                lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
                                    CameraSelector.LENS_FACING_FRONT
                                } else {
                                    CameraSelector.LENS_FACING_BACK
                                }
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

        // ── 8. Bottom Viewfinder: Mode Switcher, Geo-Card & Shutter ──────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Floating Next Pill (when items captured)
            AnimatedVisibility(
                visible = capturedMediaList.isNotEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Surface(
                    color = Color(0xFF2563EB),
                    shape = RoundedCornerShape(20.dp),
                    shadowElevation = 6.dp,
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)),
                    modifier = Modifier
                        .padding(bottom = 8.dp)
                        .clickable {
                            if (activeLocation != null) {
                                onMediaCaptured(capturedMediaList.toList(), activeLocation!!)
                            } else {
                                Toast.makeText(context, "GPS location required", Toast.LENGTH_SHORT).show()
                                refreshLocation()
                            }
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${capturedMediaList.size} Proof(s) Captured",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Next →",
                            color = Color(0xFFFBBF24),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            // ── Camera Mode Switcher (PHOTO | VIDEO) ────────────────────────
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.Black.copy(alpha = 0.65f))
                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // PHOTO TAB
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (captureMode == CameraCaptureMode.PHOTO) Color(0xFF2563EB) else Color.Transparent)
                        .clickable(enabled = !isRecording) {
                            captureMode = CameraCaptureMode.PHOTO
                        }
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "PHOTO",
                        color = Color.White,
                        fontWeight = if (captureMode == CameraCaptureMode.PHOTO) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 12.sp,
                        letterSpacing = 0.5.sp
                    )
                }

                // VIDEO TAB
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (captureMode == CameraCaptureMode.VIDEO) Color(0xFFDC2626) else Color.Transparent)
                        .clickable(enabled = !isRecording) {
                            captureMode = CameraCaptureMode.VIDEO
                        }
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "VIDEO",
                        color = Color.White,
                        fontWeight = if (captureMode == CameraCaptureMode.VIDEO) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 12.sp,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ── Live Geo-Stamp Viewfinder Card ──────────────────────────────
            Surface(
                color = Color(0xDD0F172A),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
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

            Spacer(modifier = Modifier.height(8.dp))

            // ── Shutter Button Row (Left Thumbnail Stack | Center Shutter | Right Next/Done) ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // ── LEFT CORNER: Captured Media Stack / Thumbnail ───────────
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.Black.copy(alpha = 0.55f))
                        .border(
                            width = 2.dp,
                            color = if (capturedMediaList.isNotEmpty()) Color(0xFFFBBF24) else Color.White.copy(alpha = 0.25f),
                            shape = RoundedCornerShape(14.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (capturedMediaList.isNotEmpty()) {
                        val latest = capturedMediaList.last()
                        AsyncImage(
                            model = latest,
                            contentDescription = "Latest Captured",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        if (latest.name.endsWith(".mp4")) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Video",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // Badge count in top-right of thumbnail
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = 2.dp, y = (-2).dp)
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF2563EB))
                                .border(1.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${capturedMediaList.size}",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    } else {
                        Icon(
                            imageVector = Icons.Default.PhotoLibrary,
                            contentDescription = "Gallery Stack",
                            tint = Color.White.copy(alpha = 0.35f),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                val isGpsReady = activeLocation != null

                // ── CENTER: Shutter Button (PHOTO / VIDEO) ──────────────────
                if (captureMode == CameraCaptureMode.PHOTO) {
                    Surface(
                        shape = CircleShape,
                        color = if (isGpsReady) Color.White else Color(0xFF475569),
                        border = BorderStroke(
                            4.dp,
                            if (isGpsReady) Color(0xFF2563EB) else Color(0xFF94A3B8)
                        ),
                        modifier = Modifier
                            .size(76.dp)
                            .clickable(enabled = !isCapturing) {
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

                                val nonBlurryDir = GeoCameraHelper.getRawDataNonBlurryDir(context)
                                val tempFile = File(nonBlurryDir, "raw_capture_${System.currentTimeMillis()}.jpg")
                                val outputOptions = ImageCapture.OutputFileOptions.Builder(tempFile).build()

                                capture.takePicture(
                                    outputOptions,
                                    cameraExecutor,
                                    object : ImageCapture.OnImageSavedCallback {
                                        override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                            coroutineScope.launch {
                                                val stampedFile = GeoCameraHelper.stampGeoDetailsOnImage(
                                                    context = context,
                                                    rawImageFile = tempFile,
                                                    latitude = activeLocation!!.latitude,
                                                    longitude = activeLocation!!.longitude,
                                                    locationName = activeLocation!!.name
                                                )
                                                isCapturing = false
                                                // Add to stack in bottom-left corner!
                                                capturedMediaList.add(stampedFile)
                                                Toast.makeText(
                                                    context,
                                                    "Photo added (${capturedMediaList.size}) • Take more or tap Next",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        }

                                        override fun onError(exception: ImageCaptureException) {
                                            coroutineScope.launch {
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
                                    modifier = Modifier.size(32.dp)
                                )
                            } else if (!isGpsReady) {
                                Icon(
                                    imageVector = Icons.Default.LocationOff,
                                    contentDescription = "GPS Required",
                                    tint = Color.White,
                                    modifier = Modifier.size(26.dp)
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(60.dp)
                                        .clip(CircleShape)
                                        .background(Color.White)
                                        .border(2.dp, Color(0xFF0F172A), CircleShape)
                                )
                            }
                        }
                    }
                } else {
                    // Video recording shutter
                    Surface(
                        shape = CircleShape,
                        color = Color.Transparent,
                        border = BorderStroke(
                            4.dp,
                            if (isRecording) Color(0xFFEF4444) else if (isGpsReady) Color.White else Color(0xFF64748B)
                        ),
                        modifier = Modifier
                            .size(76.dp)
                            .clickable {
                                if (!isRecording) {
                                    startVideoRecording()
                                } else {
                                    stopVideoRecording()
                                }
                            }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (isRecording) {
                                Box(
                                    modifier = Modifier
                                        .size(30.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(0xFFEF4444))
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFEF4444))
                                )
                            }
                        }
                    }
                }

                // ── RIGHT CORNER: Next / Done Button (or GPS icon if empty) ──
                if (capturedMediaList.isNotEmpty()) {
                    Surface(
                        color = Color(0xFF2563EB),
                        shape = CircleShape,
                        border = BorderStroke(2.dp, Color.White),
                        shadowElevation = 6.dp,
                        modifier = Modifier
                            .size(56.dp)
                            .clickable {
                                if (activeLocation == null) {
                                    Toast.makeText(context, "GPS Location required", Toast.LENGTH_SHORT).show()
                                    refreshLocation()
                                    return@clickable
                                }
                                onMediaCaptured(capturedMediaList.toList(), activeLocation!!)
                            }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = "Next",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                } else {
                    // Right GPS Status Indicator
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
}
