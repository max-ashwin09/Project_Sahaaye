package com.sahaaye.ui.report

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
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

@SuppressLint("ClickableViewAccessibility")
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

    // Tap to focus indicator position
    var focusPoint by remember { mutableStateOf<Offset?>(null) }

    // GPS Location State
    var activeLocation by remember { mutableStateOf<SahaayeLocation?>(null) }
    var isFetchingGps by remember { mutableStateOf(true) }
    var gpsError by remember { mutableStateOf<String?>(null) }

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
            gpsError = null
            val loc = LiveLocationService.fetchCurrentLiveLocation(context)
            isFetchingGps = false
            if (loc != null) {
                activeLocation = loc
            } else {
                gpsError = "GPS Lock required. Please check device location settings."
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
            Toast.makeText(context, "Camera permission is required to take photo", Toast.LENGTH_SHORT).show()
            onCloseClick()
        } else if (locGranted) {
            refreshLocation()
        } else {
            gpsError = "Location permission required for Geo-Camera"
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
    var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
    var cameraControl: CameraControl? by remember { mutableStateOf(null) }

    // Shutter flash visual blink effect
    var showShutterBlink by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── 1. CameraX PreviewView ──────────────────────────────────────────
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }

                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
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
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }, ContextCompat.getMainExecutor(ctx))

                // Tap to focus listener
                previewView.setOnTouchListener { view, event ->
                    if (event.action == MotionEvent.ACTION_DOWN) {
                        val factory = previewView.meteringPointFactory
                        val point = factory.createPoint(event.x, event.y)
                        val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF).build()
                        cameraControl?.startFocusAndMetering(action)
                        focusPoint = Offset(event.x, event.y)
                    }
                    true
                }

                previewView
            },
            update = { previewView ->
                // Dynamically rebind when lens facing changes
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
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }, ContextCompat.getMainExecutor(previewView.context))
            },
            modifier = Modifier.fillMaxSize()
        )

        // ── 2. Rule of Thirds 3x3 Grid Overlay ──────────────────────────────
        if (showGrid) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val gridColor = Color.White.copy(alpha = 0.25f)
                val strokeW = 1.dp.toPx()

                // Vertical lines
                drawLine(gridColor, Offset(w / 3f, 0f), Offset(w / 3f, h), strokeWidth = strokeW)
                drawLine(gridColor, Offset(2 * w / 3f, 0f), Offset(2 * w / 3f, h), strokeWidth = strokeW)

                // Horizontal lines
                drawLine(gridColor, Offset(0f, h / 3f), Offset(w, h / 3f), strokeWidth = strokeW)
                drawLine(gridColor, Offset(0f, 2 * h / 3f), Offset(w, 2 * h / 3f), strokeWidth = strokeW)
            }
        }

        // ── 3. Tap to Focus Ring Animation ──────────────────────────────────
        focusPoint?.let { pos ->
            Box(
                modifier = Modifier
                    .offset(x = (pos.x - 30).dp, y = (pos.y - 30).dp)
                    .size(60.dp)
                    .border(2.dp, Color(0xFFFBBF24), CircleShape)
            )
            LaunchedEffect(pos) {
                delay(1200)
                focusPoint = null
            }
        }

        // ── 4. Shutter Blink Effect ─────────────────────────────────────────
        if (showShutterBlink) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.7f))
            )
        }

        // ── 5. Top Controls Bar (Close, Flash, Grid, Camera Flip) ───────────
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
                            val modeName = when (flashMode) {
                                ImageCapture.FLASH_MODE_ON -> "Flash ON"
                                ImageCapture.FLASH_MODE_OFF -> "Flash OFF"
                                else -> "Flash AUTO"
                            }
                            Toast.makeText(context, modeName, Toast.LENGTH_SHORT).show()
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
                        .clickable {
                            showGrid = !showGrid
                        }
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

        // ── 6. Bottom Area: Live Geo-Stamp Card & Shutter Button ─────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ── A. Live Geo-Stamp Card on Viewfinder ─────────────────────────
            Surface(
                color = Color(0xDD0F172A),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
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

                        // Refresh GPS button
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

                    Spacer(modifier = Modifier.height(6.dp))

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

            Spacer(modifier = Modifier.height(14.dp))

            // ── B. Shutter Button & Controls Row ─────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Empty spacer for symmetry
                Spacer(modifier = Modifier.size(48.dp))

                // Big Geo-Shutter Button
                val isGpsReady = activeLocation != null
                val shutterScale by animateFloatAsState(
                    targetValue = if (isCapturing) 0.88f else 1f,
                    animationSpec = spring(stiffness = Spring.StiffnessMedium),
                    label = "shutter"
                )

                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(if (isGpsReady) Color.White else Color(0xFF475569))
                        .border(
                            4.dp,
                            if (isGpsReady) Color(0xFF2563EB) else Color(0xFF94A3B8),
                            CircleShape
                        )
                        .clickable(enabled = !isCapturing) {
                            // MANDATORY GPS CHECK: "bina location or gps acces ke photo clik nhi hoga"
                            if (activeLocation == null) {
                                Toast.makeText(
                                    context,
                                    "GPS Location is mandatory to capture geo-verified need photo. Please allow location.",
                                    Toast.LENGTH_LONG
                                ).show()
                                refreshLocation()
                                return@clickable
                            }

                            val capture = imageCapture ?: return@clickable
                            isCapturing = true
                            showShutterBlink = true

                            // Temporary file for raw capture
                            val tempFile = File.createTempFile("raw_cap_", ".jpg", context.cacheDir)
                            val outputOptions = ImageCapture.OutputFileOptions.Builder(tempFile).build()

                            capture.takePicture(
                                outputOptions,
                                cameraExecutor,
                                object : ImageCapture.OnImageSavedCallback {
                                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                        coroutineScope.launch {
                                            showShutterBlink = false
                                            // Burn Geo-Stamp on the photo
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
                                            Toast.makeText(context, "Capture failed: ${exception.message}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (isCapturing) {
                        CircularProgressIndicator(
                            color = Color(0xFF2563EB),
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(36.dp)
                        )
                    } else if (!isGpsReady) {
                        // GPS Lock Icon indicating GPS is mandatory
                        Icon(
                            imageVector = Icons.Default.LocationOff,
                            contentDescription = "GPS Required",
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    } else {
                        // Inner ready circle
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .border(2.dp, Color(0xFF0F172A), CircleShape)
                        )
                    }
                }

                // Right Status / Info Icon
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = CircleShape,
                    modifier = Modifier
                        .size(48.dp)
                        .clickable {
                            Toast.makeText(
                                context,
                                if (isGpsReady) "Geo-tagging is active: ${activeLocation?.name}" else "Waiting for GPS connection",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
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
