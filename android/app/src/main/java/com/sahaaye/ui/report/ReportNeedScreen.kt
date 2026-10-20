package com.sahaaye.ui.report

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sahaaye.data.model.NeedItem
import com.sahaaye.data.model.SahaayeLocation
import java.io.File

@Composable
fun ReportNeedScreen(
    onBackClick: () -> Unit,
    onNeedPublished: (NeedItem) -> Unit
) {
    var currentStage by remember { mutableStateOf("camera") } // "camera" or "form"
    var capturedPhotoFile by remember { mutableStateOf<File?>(null) }
    var capturedLocation by remember { mutableStateOf<SahaayeLocation?>(null) }

    BackHandler {
        if (currentStage == "form") {
            currentStage = "camera"
        } else {
            onBackClick()
        }
    }

    Crossfade(
        targetState = currentStage,
        animationSpec = tween(350),
        label = "reportStage"
    ) { stage ->
        when (stage) {
            "camera" -> {
                GeoCameraView(
                    onPhotoCaptured = { file, loc ->
                        capturedPhotoFile = file
                        capturedLocation = loc
                        currentStage = "form"
                    },
                    onCloseClick = onBackClick
                )
            }
            "form" -> {
                if (capturedPhotoFile != null && capturedLocation != null) {
                    ReportNeedFormScreen(
                        capturedPhoto = capturedPhotoFile!!,
                        capturedLocation = capturedLocation!!,
                        onRetakePhoto = {
                            currentStage = "camera"
                        },
                        onSubmitNeed = { need ->
                            onNeedPublished(need)
                        },
                        onBackClick = {
                            currentStage = "camera"
                        }
                    )
                }
            }
        }
    }
}
