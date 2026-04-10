@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ContentResolver
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.os.LocaleListCompat
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.AssignmentTurnedIn
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import com.taskbandit.app.mobile.MobileDashboard
import com.taskbandit.app.mobile.MobileDashboardSyncSignal
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.MobileChoreTemplate
import com.taskbandit.app.mobile.MobileNotificationDevice
import com.taskbandit.app.mobile.MobileNotificationDeviceRegistration
import com.taskbandit.app.mobile.MobileTakeoverRequest
import com.taskbandit.app.mobile.MobileTemplateRecurrence
import com.taskbandit.app.mobile.MobileThemeMode
import com.taskbandit.app.mobile.MobileUploadedProof
import com.taskbandit.app.mobile.TaskBanditDashboardSyncClient
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditAppPreferencesStore
import com.taskbandit.app.mobile.TaskBanditOutboxStore
import com.taskbandit.app.mobile.MobileChoreSubmissionDraft
import com.taskbandit.app.mobile.TaskBanditSession
import com.taskbandit.app.mobile.TaskBanditSessionStore
import com.taskbandit.app.mobile.TaskBanditTransportException
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.mobile.TaskBanditWidgetStore
import com.taskbandit.app.mobile.MobileReleaseInfo
import com.taskbandit.app.push.TaskBanditFirebasePushManager
import com.taskbandit.app.ui.theme.TaskBanditTheme
import com.taskbandit.app.widget.TaskBanditWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.WeekFields
import java.io.File
import java.util.Locale
import java.util.UUID

private const val defaultApiBaseUrl = "http://10.0.2.2:8080"
private const val syncDisconnectNoticeDelayMs = 3500L
private const val mutationReconnectWindowMs = 5000L
private const val mutationReconnectRetryDelayMs = 750L

private enum class MobileDashboardTab {
    CHORES,
    CREATE,
    SETTINGS
}

private enum class MobileChoreSection {
    MINE,
    UNASSIGNED,
    OTHERS
}

private enum class MobileChoreSectionTone {
    MINE,
    UNASSIGNED,
    OTHERS,
    HISTORIC
}

private fun isTabletWidth(maxWidth: Dp): Boolean = maxWidth >= 840.dp

private data class MobileDashboardRefresh(
    val dashboard: MobileDashboard,
    val latestReleaseInfo: MobileReleaseInfo?,
    val notificationDevices: List<MobileNotificationDevice>
)

private data class MobileChoiceOption(
    val label: String,
    val selected: Boolean,
    val onClick: () -> Unit
)

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val sharedPreferences = getSharedPreferences("taskbandit-session", MODE_PRIVATE)
        val sessionStore = TaskBanditSessionStore(sharedPreferences)
        val appPreferencesStore = TaskBanditAppPreferencesStore(sharedPreferences)
        val widgetStore = TaskBanditWidgetStore(sharedPreferences)
        val initialLanguageTag = appPreferencesStore.readLanguageTag()
        val initialLocaleList = if (initialLanguageTag == "system") {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(initialLanguageTag)
        }

        AppCompatDelegate.setApplicationLocales(initialLocaleList)
        super.onCreate(savedInstanceState)

        setContent {
            TaskBanditApp(
                api = TaskBanditMobileApi(),
                sessionStore = sessionStore,
                appPreferencesStore = appPreferencesStore,
                widgetStore = widgetStore
            )
        }
    }
}

@Composable
private fun TaskBanditApp(
    api: TaskBanditMobileApi,
    sessionStore: TaskBanditSessionStore,
    appPreferencesStore: TaskBanditAppPreferencesStore,
    widgetStore: TaskBanditWidgetStore
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val loginFailedMessage = stringResource(R.string.mobile_login_failed)
    val checklistRequiredMessage = stringResource(R.string.mobile_checklist_required)
    val photoRequiredMessage = stringResource(R.string.mobile_photo_required_missing)
    val submissionSentMessage = stringResource(R.string.mobile_submission_sent)
    val submittingMessage = stringResource(R.string.mobile_submitting)
    val approvingMessage = stringResource(R.string.mobile_approving)
    val rejectingMessage = stringResource(R.string.mobile_rejecting)
    val markingReadMessage = stringResource(R.string.mobile_marking_read)
    val startingMessage = stringResource(R.string.mobile_starting)
    val takingOverMessage = stringResource(R.string.mobile_taking_over_task)
    val takeoverRequestSendingMessage = stringResource(R.string.mobile_request_takeover_sending)
    val takeoverRequestApprovingMessage = stringResource(R.string.mobile_takeover_request_approving)
    val takeoverRequestDecliningMessage = stringResource(R.string.mobile_takeover_request_declining)
    val creatingChoreMessage = stringResource(R.string.mobile_create_creating)
    val closingCycleMessage = stringResource(R.string.mobile_closing_cycle)
    val deviceRemovingMessage = stringResource(R.string.mobile_device_removing)
    val choreStartedMessage = stringResource(R.string.mobile_chore_started)
    val choreTakenOverMessage = stringResource(R.string.mobile_chore_taken_over)
    val takeoverRequestSentMessage = stringResource(R.string.mobile_takeover_request_sent)
    val takeoverApprovedMessage = stringResource(R.string.mobile_takeover_request_approved_notice)
    val takeoverDeclinedMessage = stringResource(R.string.mobile_takeover_request_declined_notice)
    val createChoreFailedMessage = stringResource(R.string.mobile_create_chore_failed)
    val cycleClosedMessage = stringResource(R.string.mobile_cycle_closed)
    val deviceRemovedMessage = stringResource(R.string.mobile_device_removed)
    val reconnectFailedMessage = stringResource(R.string.mobile_connection_restore_failed)
    val closeCycleFailedMessage = stringResource(R.string.mobile_close_cycle_failed)
    var session by remember { mutableStateOf(sessionStore.readSession()) }
    var themeMode by remember { mutableStateOf(appPreferencesStore.readThemeMode()) }
    var languageTag by remember { mutableStateOf(appPreferencesStore.readLanguageTag()) }
    val currentReleaseInfo = remember {
        MobileReleaseInfo(
            releaseVersion = BuildConfig.TASKBANDIT_RELEASE_VERSION,
            buildNumber = BuildConfig.TASKBANDIT_BUILD_NUMBER,
            commitSha = BuildConfig.TASKBANDIT_COMMIT_SHA
        )
    }
    val installationId = remember { sessionStore.getOrCreateInstallationId() }
    val dashboardSyncClient = remember { TaskBanditDashboardSyncClient() }
    var serverUrl by remember { mutableStateOf(session.baseUrl) }
    var email by remember { mutableStateOf("alex@taskbandit.local") }
    var password by remember { mutableStateOf("TaskBandit123!") }
    var dashboard by remember { mutableStateOf<MobileDashboard?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }
    var serverReleaseInfo by remember { mutableStateOf<MobileReleaseInfo?>(null) }
    var notificationDevices by remember { mutableStateOf<List<MobileNotificationDevice>>(emptyList()) }
    var dismissedUpdateKey by remember { mutableStateOf(sessionStore.readDismissedUpdateKey()) }
    var isBusy by remember { mutableStateOf(session.token != null) }
    var refreshQueued by remember { mutableStateOf(false) }
    var isSyncingQueue by remember { mutableStateOf(false) }
    var activeReviewAction by remember { mutableStateOf<String?>(null) }
    var activeNotificationAction by remember { mutableStateOf<String?>(null) }
    var activeStartAction by remember { mutableStateOf<String?>(null) }
    var activeSubmitAction by remember { mutableStateOf<String?>(null) }
    var activeCloseCycleAction by remember { mutableStateOf<String?>(null) }
    var activeTakeoverRequestAction by remember { mutableStateOf<String?>(null) }
    var activeCreateAction by remember { mutableStateOf<String?>(null) }
    var createSuccessCounter by remember { mutableIntStateOf(0) }
    var activeDeviceAction by remember { mutableStateOf<String?>(null) }
    var isDashboardSyncConnected by remember { mutableStateOf(true) }
    var showDashboardSyncNotice by remember { mutableStateOf(false) }
    var pendingReconnectActionLabel by remember { mutableStateOf<String?>(null) }
    var validationDialogMessage by remember { mutableStateOf<String?>(null) }
    var submitSelections by remember { mutableStateOf<Map<String, Set<String>>>(emptyMap()) }
    var selectedProofUris by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var pendingPhotoPickerChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureUriString by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureFilePath by remember { mutableStateOf<String?>(null) }
    var queuedSubmissionCount by remember { mutableIntStateOf(0) }
    var notificationsPermissionGranted by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
        )
    }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        notificationsPermissionGranted = granted
    }

    LaunchedEffect(languageTag) {
        val localeList = if (languageTag == "system") {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(languageTag)
        }
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    val proofPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        val choreId = pendingPhotoPickerChoreId
        if (choreId != null) {
            uris.forEach { uri ->
                runCatching {
                    context.contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                }
            }

            val existingUris = selectedProofUris[choreId].orEmpty()
            selectedProofUris =
                selectedProofUris + (choreId to (existingUris + uris.map(Uri::toString)).distinct())
        }
        pendingPhotoPickerChoreId = null
    }

    val proofCameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        val choreId = pendingPhotoCaptureChoreId
        val uriString = pendingPhotoCaptureUriString
        val filePath = pendingPhotoCaptureFilePath

        if (success && choreId != null && uriString != null) {
            val existingUris = selectedProofUris[choreId].orEmpty()
            selectedProofUris =
                selectedProofUris + (choreId to (existingUris + uriString).distinct())
        } else if (!success && !filePath.isNullOrBlank()) {
            runCatching { File(filePath).delete() }
        }

        pendingPhotoCaptureChoreId = null
        pendingPhotoCaptureUriString = null
        pendingPhotoCaptureFilePath = null
    }

    LaunchedEffect(isDashboardSyncConnected) {
        if (isDashboardSyncConnected) {
            showDashboardSyncNotice = false
        } else {
            delay(syncDisconnectNoticeDelayMs)
            if (!isDashboardSyncConnected) {
                showDashboardSyncNotice = true
            }
        }
    }

    fun normalizedServerUrl() = serverUrl.trim().ifBlank { defaultApiBaseUrl }

    fun logout() {
        val baseUrl = normalizedServerUrl()
        sessionStore.clearToken(baseUrl)
        widgetStore.clear()
        TaskBanditWidgetProvider.refreshAllWidgets(context)
        session = TaskBanditSession(baseUrl = baseUrl, token = null)
        serverUrl = baseUrl
        dashboard = null
        serverReleaseInfo = null
        notificationDevices = emptyList()
        isDashboardSyncConnected = true
        showDashboardSyncNotice = false
        isBusy = false
        refreshQueued = false
        errorMessage = null
        noticeMessage = null
        pendingReconnectActionLabel = null
        validationDialogMessage = null
    }

    suspend fun <T> runMutationWithReconnectWindow(
        actionLabel: String,
        block: suspend () -> T
    ): T {
        val deadline = System.currentTimeMillis() + mutationReconnectWindowMs
        var reconnecting = false
        try {
            while (true) {
                try {
                    return block()
                } catch (throwable: Throwable) {
                    if (throwable !is TaskBanditTransportException) {
                        throw throwable
                    }

                    val now = System.currentTimeMillis()
                    if (now >= deadline) {
                        throw IllegalStateException(reconnectFailedMessage)
                    }

                    if (!reconnecting) {
                        reconnecting = true
                        pendingReconnectActionLabel = actionLabel
                    }

                    delay(minOf(mutationReconnectRetryDelayMs, deadline - now))
                }
            }
        } finally {
            pendingReconnectActionLabel = null
        }
    }

    fun refreshDashboard() {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        isBusy = true
        refreshQueued = false
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                val refreshPayload = withContext(Dispatchers.IO) {
                    val latestReleaseInfo = runCatching { api.getReleaseInfo(baseUrl) }.getOrNull()
                    runCatching {
                        val pushToken = TaskBanditFirebasePushManager.getTokenOrNull(context)
                        if (!pushToken.isNullOrBlank()) {
                            sessionStore.savePushToken(pushToken)
                        }
                        val registeredPushToken = pushToken ?: sessionStore.readPushToken()

                        api.registerNotificationDevice(
                            baseUrl = baseUrl,
                            token = token,
                            registration = MobileNotificationDeviceRegistration(
                                installationId = installationId,
                                deviceName = buildAndroidDeviceName(),
                                provider = if (registeredPushToken.isNullOrBlank()) "generic" else "fcm",
                                pushToken = registeredPushToken,
                                appVersion = readAppVersion(context),
                                locale = Locale.getDefault().toLanguageTag()
                            )
                        )
                    }

                    MobileDashboardRefresh(
                        dashboard = api.loadDashboard(baseUrl, token),
                        latestReleaseInfo = latestReleaseInfo,
                        notificationDevices = runCatching {
                            api.getNotificationDevices(baseUrl, token)
                        }.getOrDefault(emptyList())
                    )
                }
                refreshPayload
            }.onSuccess { loadedPayload ->
                dashboard = loadedPayload.dashboard
                serverReleaseInfo = loadedPayload.latestReleaseInfo
                notificationDevices = loadedPayload.notificationDevices
                serverUrl = baseUrl
                sessionStore.saveSession(baseUrl, token)
                queuedSubmissionCount = 0
                widgetStore.saveDashboard(loadedPayload.dashboard, 0)
                TaskBanditWidgetProvider.refreshAllWidgets(context)
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            isBusy = false
            isSyncingQueue = false
            if (refreshQueued && session.token != null) {
                refreshQueued = false
                refreshDashboard()
            }
        }
    }

    fun requestDashboardRefresh() {
        if (session.token == null) {
            return
        }

        if (isBusy) {
            refreshQueued = true
            return
        }

        refreshDashboard()
    }

    fun reviewPendingChore(instanceId: String, approve: Boolean) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeReviewAction = "${if (approve) "approve" else "reject"}:$instanceId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(approvingMessage.takeIf { approve } ?: rejectingMessage) {
                        if (approve) {
                            api.approveChore(baseUrl, token, instanceId)
                        } else {
                            api.rejectChore(baseUrl, token, instanceId)
                        }
                    }
                }
            }.onSuccess {
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeReviewAction = null
        }
    }

    fun markNotificationRead(notificationId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeNotificationAction = "notification:$notificationId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(markingReadMessage) {
                        api.markNotificationRead(baseUrl, token, notificationId)
                    }
                }
            }.onSuccess {
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeNotificationAction = null
        }
    }

    fun toggleChecklistItem(choreId: String, checklistItemId: String, defaultIds: List<String>) {
        val currentSelection = submitSelections[choreId] ?: defaultIds.toSet()
        val nextSelection = currentSelection.toMutableSet()
        if (!nextSelection.add(checklistItemId)) {
            nextSelection.remove(checklistItemId)
        }

        submitSelections = submitSelections + (choreId to nextSelection)
    }

    fun openProofPicker(choreId: String) {
        pendingPhotoPickerChoreId = choreId
        proofPicker.launch(arrayOf("image/*"))
    }

    fun takeProofPhoto(choreId: String) {
        val captureFile = createProofCaptureFile(context)
        val captureUri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            captureFile
        )

        pendingPhotoCaptureChoreId = choreId
        pendingPhotoCaptureUriString = captureUri.toString()
        pendingPhotoCaptureFilePath = captureFile.absolutePath
        proofCameraLauncher.launch(captureUri)
    }

    fun startChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeStartAction = "start:$choreId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(startingMessage) {
                        api.startChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = choreStartedMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeStartAction = null
        }
    }

    fun takeOverChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeStartAction = "takeover:$choreId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(takingOverMessage) {
                        api.takeOverChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = choreTakenOverMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeStartAction = null
        }
    }

    fun requestTakeover(choreId: String, requestedUserId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeTakeoverRequestAction = "request:$choreId:$requestedUserId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(takeoverRequestSendingMessage) {
                        api.requestTakeover(baseUrl, token, choreId, requestedUserId)
                    }
                }
            }.onSuccess {
                noticeMessage = takeoverRequestSentMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeTakeoverRequestAction = null
        }
    }

    fun respondToTakeoverRequest(requestId: String, approve: Boolean) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeTakeoverRequestAction = "${if (approve) "approve" else "decline"}:$requestId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(
                        if (approve) takeoverRequestApprovingMessage else takeoverRequestDecliningMessage
                    ) {
                        if (approve) {
                            api.approveTakeoverRequest(baseUrl, token, requestId)
                        } else {
                            api.declineTakeoverRequest(baseUrl, token, requestId)
                        }
                    }
                }
            }.onSuccess {
                noticeMessage = if (approve) takeoverApprovedMessage else takeoverDeclinedMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeTakeoverRequestAction = null
        }
    }

    fun submitChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        val chore = dashboard?.chores?.firstOrNull { it.id == choreId } ?: return

        val selectedChecklistIds = (submitSelections[choreId] ?: chore.completedChecklistIds.toSet()).toList()
        val proofUriStrings = selectedProofUris[choreId].orEmpty()
        val missingRequiredItems = chore.checklist.filter { it.required && !selectedChecklistIds.contains(it.id) }
        if (missingRequiredItems.isNotEmpty()) {
            validationDialogMessage = checklistRequiredMessage
            return
        }

        if (chore.requirePhotoProof && proofUriStrings.isEmpty()) {
            validationDialogMessage = photoRequiredMessage
            return
        }

        val draft = MobileChoreSubmissionDraft(
            id = UUID.randomUUID().toString(),
            choreId = choreId,
            completedChecklistIds = selectedChecklistIds,
            proofUriStrings = proofUriStrings,
            note = null,
            queuedAtEpochMillis = System.currentTimeMillis()
        )

        activeSubmitAction = "submit:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(submittingMessage) {
                        submitDraft(
                            api = api,
                            baseUrl = baseUrl,
                            token = token,
                            draft = draft,
                            contentResolver = context.contentResolver
                        )
                    }
                }
                selectedProofUris = selectedProofUris - choreId
                submitSelections = submitSelections - choreId
                dashboard = dashboard?.copy(
                    chores = dashboard?.chores.orEmpty().filterNot { it.id == choreId }
                )
                noticeMessage = submissionSentMessage
                requestDashboardRefresh()
            } catch (throwable: Throwable) {
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: reconnectFailedMessage
                }
            }
            activeSubmitAction = null
        }
    }

    fun createChore(
        templateId: String,
        dueAtIsoUtc: String,
        assigneeId: String?,
        assignmentStrategy: String,
        recurrenceType: String?,
        recurrenceIntervalDays: Int?,
        recurrenceEndMode: String?,
        recurrenceOccurrences: Int?,
        recurrenceEndsAtIsoUtc: String?,
        variantId: String? = null
    ) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeCreateAction = "create:$templateId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(creatingChoreMessage) {
                        api.createChoreInstance(
                            baseUrl = baseUrl,
                            token = token,
                            templateId = templateId,
                            dueAtIsoUtc = dueAtIsoUtc,
                            assigneeId = assigneeId,
                            assignmentStrategy = assignmentStrategy,
                            recurrenceType = recurrenceType,
                            recurrenceIntervalDays = recurrenceIntervalDays,
                            recurrenceEndMode = recurrenceEndMode,
                            recurrenceOccurrences = recurrenceOccurrences,
                            recurrenceEndsAtIsoUtc = recurrenceEndsAtIsoUtc,
                            suppressRecurrence = recurrenceType == "none",
                            variantId = variantId
                        )
                    }
                }
            }.onSuccess {
                createSuccessCounter += 1
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: createChoreFailedMessage
                }
            }
            activeCreateAction = null
        }
    }

    fun closeChoreCycle(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeCloseCycleAction = "close-cycle:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(closingCycleMessage) {
                        api.closeChoreCycle(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = cycleClosedMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: closeCycleFailedMessage
                }
            }
            activeCloseCycleAction = null
        }
    }

    fun removeNotificationDevice(deviceId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeDeviceAction = "remove:$deviceId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(deviceRemovingMessage) {
                        api.deleteNotificationDevice(baseUrl, token, deviceId)
                    }
                }
            }.onSuccess { devices ->
                notificationDevices = devices
                noticeMessage = deviceRemovedMessage
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message
                }
            }
            activeDeviceAction = null
        }
    }

    fun updateThemeMode(nextThemeMode: MobileThemeMode) {
        appPreferencesStore.saveThemeMode(nextThemeMode)
        themeMode = nextThemeMode
    }

    fun updateLanguageTag(nextLanguageTag: String) {
        appPreferencesStore.saveLanguageTag(nextLanguageTag)
        languageTag = nextLanguageTag
    }

    LaunchedEffect(session.token) {
        if (session.token != null) {
            if (
                TaskBanditFirebasePushManager.isConfigured() &&
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            requestDashboardRefresh()
        }
    }

    val activeBaseUrl = normalizedServerUrl()

    LaunchedEffect(activeBaseUrl, session.token) {
        val token = session.token ?: return@LaunchedEffect

        dashboardSyncClient.connect(activeBaseUrl, token).collect { signal ->
            when (signal) {
                MobileDashboardSyncSignal.Connected -> isDashboardSyncConnected = true
                MobileDashboardSyncSignal.Disconnected -> isDashboardSyncConnected = false
                MobileDashboardSyncSignal.RefreshRequested -> requestDashboardRefresh()
                MobileDashboardSyncSignal.Unauthorized -> logout()
            }
        }
    }

    LaunchedEffect(activeBaseUrl, session.token) {
        if (session.token != null) {
            return@LaunchedEffect
        }

        runCatching {
            withContext(Dispatchers.IO) {
                api.getReleaseInfo(activeBaseUrl)
            }
        }.onSuccess { latestReleaseInfo ->
            serverReleaseInfo = latestReleaseInfo
        }.onFailure {
            serverReleaseInfo = null
        }
    }

    // Refresh the dashboard whenever the app returns to the foreground (e.g. after an
    // app update is applied while the process is still alive). LaunchedEffect(session.token)
    // only fires when the token value itself changes, so it won't re-trigger if the Activity
    // is merely resumed without an Activity recreation.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && session.token != null) {
                refreshDashboard()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val availableUpdate = serverReleaseInfo?.takeIf {
        compareReleaseInfo(currentReleaseInfo, it) < 0
    }
    val availableUpdateKey = availableUpdate?.let(::createReleaseKey)
    val visibleUpdate = availableUpdate?.takeIf { availableUpdateKey != dismissedUpdateKey }
    val currentReleaseLabel = formatReleaseLabel(currentReleaseInfo)
    val serverReleaseLabel = serverReleaseInfo?.let(::formatReleaseLabel)
    fun dismissUpdateNotice() {
        val updateKey = availableUpdateKey ?: return
        sessionStore.saveDismissedUpdateKey(updateKey)
        dismissedUpdateKey = updateKey
    }

    val isDarkTheme = when (themeMode) {
        MobileThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
        MobileThemeMode.LIGHT -> false
        MobileThemeMode.DARK -> true
    }

    TaskBanditTheme(darkTheme = isDarkTheme) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            if (session.token == null) {
                LoginScreen(
                    serverUrl = serverUrl,
                    currentReleaseLabel = currentReleaseLabel,
                    serverReleaseLabel = serverReleaseLabel,
                    availableUpdate = visibleUpdate,
                    email = email,
                    password = password,
                    isBusy = isBusy,
                    errorMessage = errorMessage,
                    onDismissUpdate = ::dismissUpdateNotice,
                    onServerUrlChange = {
                        serverUrl = it
                        sessionStore.saveBaseUrl(it)
                    },
                    onEmailChange = { email = it },
                    onPasswordChange = { password = it },
                    onLogin = {
                        isBusy = true
                        errorMessage = null
                        coroutineScope.launch {
                            val baseUrl = normalizedServerUrl()
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    api.login(baseUrl, email, password)
                                }
                            }.onSuccess { token ->
                                serverUrl = baseUrl
                                sessionStore.saveSession(baseUrl, token)
                                session = TaskBanditSession(baseUrl = baseUrl, token = token)
                            }.onFailure { throwable ->
                                errorMessage = throwable.message ?: loginFailedMessage
                            }
                            isBusy = false
                        }
                    }
                )
            } else {
                DashboardScreen(
                    dashboard = dashboard,
                    serverUrl = serverUrl,
                    currentReleaseLabel = currentReleaseLabel,
                    serverReleaseLabel = serverReleaseLabel,
                    availableUpdate = visibleUpdate,
                    notificationDevices = notificationDevices,
                    installationId = installationId,
                    languageTag = languageTag,
                    themeMode = themeMode,
                    notificationsPermissionGranted = notificationsPermissionGranted,
                    isBusy = isBusy,
                    showDashboardSyncNotice = showDashboardSyncNotice,
                    isSyncingQueue = isSyncingQueue,
                    activeReviewAction = activeReviewAction,
                    activeStartAction = activeStartAction,
                    activeSubmitAction = activeSubmitAction,
                    activeCloseCycleAction = activeCloseCycleAction,
                    activeTakeoverRequestAction = activeTakeoverRequestAction,
                    activeCreateAction = activeCreateAction,
                    createSuccessCounter = createSuccessCounter,
                    activeDeviceAction = activeDeviceAction,
                    errorMessage = errorMessage,
                    noticeMessage = noticeMessage,
                    pendingReconnectActionLabel = pendingReconnectActionLabel,
                    validationDialogMessage = validationDialogMessage,
                    queuedSubmissionCount = queuedSubmissionCount,
                    onDismissValidationDialog = { validationDialogMessage = null },
                    onDismissUpdate = ::dismissUpdateNotice,
                    onRefresh = ::requestDashboardRefresh,
                    onLogout = ::logout,
                    onApprove = { instanceId -> reviewPendingChore(instanceId, true) },
                    onReject = { instanceId -> reviewPendingChore(instanceId, false) },
                    onToggleChecklistItem = ::toggleChecklistItem,
                    submitSelections = submitSelections,
                    selectedProofUris = selectedProofUris,
                    onPickProofs = ::openProofPicker,
                    onTakeProofPhoto = ::takeProofPhoto,
                    onStartChore = ::startChore,
                    onCloseChoreCycle = ::closeChoreCycle,
                    onTakeOverChore = ::takeOverChore,
                    onRequestTakeover = ::requestTakeover,
                    onRespondToTakeoverRequest = ::respondToTakeoverRequest,
                    onSubmitChore = ::submitChore,
                    onCreateChore = ::createChore,
                    onRemoveNotificationDevice = ::removeNotificationDevice,
                    onThemeModeChange = ::updateThemeMode,
                    onLanguageTagChange = ::updateLanguageTag,
                    onRequestNotificationPermission = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    }
                )
            }
        }
    }
}

private fun buildAndroidDeviceName(): String {
    val manufacturer = Build.MANUFACTURER.orEmpty().trim()
    val model = Build.MODEL.orEmpty().trim()
    return listOf(manufacturer, model)
        .filter { it.isNotBlank() }
        .joinToString(" ")
        .ifBlank { "Android device" }
}

private fun parseReleaseVersionParts(value: String): List<Int> =
    value.split('.', '-')
        .mapNotNull { it.toIntOrNull() }

private fun compareReleaseVersions(current: String, latest: String): Int {
    val currentParts = parseReleaseVersionParts(current)
    val latestParts = parseReleaseVersionParts(latest)
    val maxSize = maxOf(currentParts.size, latestParts.size)

    for (index in 0 until maxSize) {
        val currentValue = currentParts.getOrElse(index) { 0 }
        val latestValue = latestParts.getOrElse(index) { 0 }
        if (currentValue != latestValue) {
            return currentValue.compareTo(latestValue)
        }
    }

    return 0
}

private fun compareReleaseInfo(current: MobileReleaseInfo, latest: MobileReleaseInfo): Int {
    val versionComparison = compareReleaseVersions(current.releaseVersion, latest.releaseVersion)
    if (versionComparison != 0) {
        return versionComparison
    }

    val currentBuild = current.buildNumber.toIntOrNull()
    val latestBuild = latest.buildNumber.toIntOrNull()
    if (currentBuild != null && latestBuild != null && currentBuild != latestBuild) {
        return currentBuild.compareTo(latestBuild)
    }

    return current.buildNumber.compareTo(latest.buildNumber)
}

private fun createReleaseKey(release: MobileReleaseInfo): String =
    "${release.releaseVersion}+${release.buildNumber}"

private fun formatReleaseLabel(release: MobileReleaseInfo): String =
    "v${release.releaseVersion} (build ${release.buildNumber})"

private fun readAppVersion(context: android.content.Context): String? {
    return runCatching {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        val versionName = packageInfo.versionName?.ifBlank { BuildConfig.TASKBANDIT_RELEASE_VERSION }
            ?: BuildConfig.TASKBANDIT_RELEASE_VERSION
        "$versionName+${BuildConfig.TASKBANDIT_BUILD_NUMBER}"
    }.getOrNull()
}

@Composable
private fun LoginScreen(
    serverUrl: String,
    currentReleaseLabel: String,
    serverReleaseLabel: String?,
    availableUpdate: MobileReleaseInfo?,
    email: String,
    password: String,
    isBusy: Boolean,
    errorMessage: String?,
    onDismissUpdate: () -> Unit,
    onServerUrlChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLogin: () -> Unit
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        MaterialTheme.colorScheme.primaryContainer,
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .padding(horizontal = 20.dp, vertical = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        val isTablet = isTabletWidth(maxWidth)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (isTablet) Modifier.widthIn(max = 1040.dp) else Modifier.widthIn(max = 520.dp))
        ) {
            if (isTablet) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(28.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_taskbandit_mark),
                            contentDescription = stringResource(R.string.brand_mark_description),
                            modifier = Modifier.size(104.dp)
                        )
                        Text(
                            text = stringResource(R.string.mobile_login_title),
                            style = MaterialTheme.typography.headlineMedium
                        )
                        Text(
                            text = stringResource(R.string.mobile_login_hint),
                            style = MaterialTheme.typography.bodyLarge
                        )
                        SettingsValueLine(
                            label = stringResource(R.string.mobile_settings_app_release),
                            value = currentReleaseLabel
                        )
                        serverReleaseLabel?.let {
                            SettingsValueLine(
                                label = stringResource(R.string.mobile_settings_server_release),
                                value = it
                            )
                        }
                        availableUpdate?.let {
                            Card {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = stringResource(R.string.mobile_update_available_title),
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        text = stringResource(
                                            R.string.mobile_update_available_body,
                                            currentReleaseLabel,
                                            formatReleaseLabel(it)
                                        ),
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Button(onClick = onDismissUpdate) {
                                        Text(stringResource(R.string.mobile_update_dismiss))
                                    }
                                }
                            }
                        }
                    }
                    Column(
                        modifier = Modifier.weight(1.15f),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = onServerUrlChange,
                            label = { Text(stringResource(R.string.mobile_server_url)) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = email,
                            onValueChange = onEmailChange,
                            label = { Text(stringResource(R.string.mobile_email)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = password,
                            onValueChange = onPasswordChange,
                            label = { Text(stringResource(R.string.mobile_password)) },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (!errorMessage.isNullOrBlank()) {
                            Text(
                                text = errorMessage,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Button(
                            onClick = onLogin,
                            enabled = !isBusy,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (isBusy) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Text(stringResource(R.string.mobile_login_action))
                            }
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Image(
                        painter = painterResource(R.drawable.ic_taskbandit_mark),
                        contentDescription = stringResource(R.string.brand_mark_description),
                        modifier = Modifier.size(84.dp)
                    )
                    Text(
                        text = stringResource(R.string.mobile_login_title),
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Text(
                        text = stringResource(R.string.mobile_login_hint),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = stringResource(R.string.mobile_app_release, currentReleaseLabel),
                        style = MaterialTheme.typography.bodySmall
                    )
                    if (serverReleaseLabel != null) {
                        Text(
                            text = stringResource(R.string.mobile_server_release, serverReleaseLabel),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    if (availableUpdate != null) {
                        Card {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = stringResource(R.string.mobile_update_available_title),
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = stringResource(
                                        R.string.mobile_update_available_body,
                                        currentReleaseLabel,
                                        formatReleaseLabel(availableUpdate)
                                    ),
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Button(onClick = onDismissUpdate) {
                                    Text(stringResource(R.string.mobile_update_dismiss))
                                }
                            }
                        }
                    }
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = onServerUrlChange,
                        label = { Text(stringResource(R.string.mobile_server_url)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = email,
                        onValueChange = onEmailChange,
                        label = { Text(stringResource(R.string.mobile_email)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = onPasswordChange,
                        label = { Text(stringResource(R.string.mobile_password)) },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (!errorMessage.isNullOrBlank()) {
                        Text(
                            text = errorMessage,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    Button(
                        onClick = onLogin,
                        enabled = !isBusy,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (isBusy) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            Text(stringResource(R.string.mobile_login_action))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardScreen(
    dashboard: MobileDashboard?,
    serverUrl: String,
    currentReleaseLabel: String,
    serverReleaseLabel: String?,
    availableUpdate: MobileReleaseInfo?,
    notificationDevices: List<MobileNotificationDevice>,
    installationId: String,
    languageTag: String,
    themeMode: MobileThemeMode,
    notificationsPermissionGranted: Boolean,
    isBusy: Boolean,
    showDashboardSyncNotice: Boolean,
    isSyncingQueue: Boolean,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeTakeoverRequestAction: String?,
    activeCreateAction: String?,
    createSuccessCounter: Int,
    activeDeviceAction: String?,
    errorMessage: String?,
    noticeMessage: String?,
    pendingReconnectActionLabel: String?,
    validationDialogMessage: String?,
    queuedSubmissionCount: Int,
    onDismissValidationDialog: () -> Unit,
    onDismissUpdate: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onPickProofs: (String) -> Unit,
    onTakeProofPhoto: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String, String) -> Unit,
    onRespondToTakeoverRequest: (String, Boolean) -> Unit,
    onSubmitChore: (String) -> Unit,
    onCreateChore: (String, String, String?, String, String?, Int?, String?, Int?, String?, String?) -> Unit,
    onRemoveNotificationDevice: (String) -> Unit,
    onThemeModeChange: (MobileThemeMode) -> Unit,
    onLanguageTagChange: (String) -> Unit,
    onRequestNotificationPermission: () -> Unit
) {
    val context = LocalContext.current
    val isCreatorRole = dashboard?.user?.role == "admin" || dashboard?.user?.role == "parent"
    val currentUserId = dashboard?.user?.id
    val currentUserRole = dashboard?.user?.role
    var activeTab by rememberSaveable { mutableStateOf(MobileDashboardTab.CHORES) }
    var selectedTemplateId by rememberSaveable { mutableStateOf<String?>(null) }
    var createDueAtMillis by rememberSaveable { mutableStateOf(defaultCreateDueAtMillis()) }
    var createAssignmentStrategy by rememberSaveable { mutableStateOf("round_robin") }
    var createAssigneeId by rememberSaveable { mutableStateOf<String?>(null) }
    var createRecurrenceType by rememberSaveable { mutableStateOf("template") }
    var createRecurrenceIntervalInput by rememberSaveable { mutableStateOf("7") }
    var createRecurrenceEndMode by rememberSaveable { mutableStateOf("never") }
    var createRecurrenceOccurrencesInput by rememberSaveable { mutableStateOf("3") }
    var createRecurrenceEndsAtMillis by rememberSaveable { mutableLongStateOf(defaultCreateRecurrenceEndsAtMillis()) }
    var expandedChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var expandedHistoricChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var templateDropdownExpanded by remember { mutableStateOf(false) }
    var recurrenceTypeDropdownExpanded by remember { mutableStateOf(false) }
    var assignmentStrategyDropdownExpanded by remember { mutableStateOf(false) }
    var assigneeDropdownExpanded by remember { mutableStateOf(false) }
    var createVariantId by rememberSaveable { mutableStateOf<String?>(null) }
    var variantDropdownExpanded by remember { mutableStateOf(false) }
    var showCreateSuccessDialog by remember { mutableStateOf(false) }
    var startConfirmationChoreId by rememberSaveable { mutableStateOf<String?>(null) }
    var takeoverConfirmationChoreId by rememberSaveable { mutableStateOf<String?>(null) }
    var submitConfirmationChoreId by rememberSaveable { mutableStateOf<String?>(null) }
    var requestTakeoverChoreId by rememberSaveable { mutableStateOf<String?>(null) }
    var requestTakeoverMemberId by rememberSaveable { mutableStateOf<String?>(null) }
    val currentDevice = notificationDevices.firstOrNull { it.installationId == installationId }
    val templates = dashboard?.templates.orEmpty()
    val members = dashboard?.members.orEmpty()
    val pendingTakeoverRequests = dashboard?.takeoverRequests.orEmpty()
    val supportsTakeoverRequests = dashboard?.compatibility?.takeoverRequestsSupported ?: true
    val incomingTakeoverRequests = remember(pendingTakeoverRequests, currentUserId, supportsTakeoverRequests) {
        if (!supportsTakeoverRequests) {
            emptyList()
        } else {
            pendingTakeoverRequests.filter { it.status == "PENDING" && it.requested.id == currentUserId }
        }
    }
    val outgoingTakeoverRequestsByChoreId = remember(pendingTakeoverRequests, currentUserId, supportsTakeoverRequests) {
        if (!supportsTakeoverRequests) {
            emptyMap()
        } else {
            pendingTakeoverRequests
                .filter { it.status == "PENDING" && it.requester.id == currentUserId }
                .associateBy { it.choreId }
        }
    }
    val selectedTemplate = remember(templates, selectedTemplateId) {
        templates.firstOrNull { it.id == selectedTemplateId } ?: templates.firstOrNull()
    }
    val eligibleTakeoverMembers = remember(members, currentUserId) {
        members.filter { it.id != currentUserId }
    }
    val sortedChores = remember(dashboard?.chores, currentUserId) {
        dashboard?.chores.orEmpty()
            .filter { it.state !in setOf("completed", "approved", "rejected") }
            .sortedWith(compareBy({ choreSectionRank(resolveChoreSection(it, currentUserId)) }, { parseInstantForSort(it.dueAt) }, { it.title.lowercase(Locale.getDefault()) }))
    }
    val historicChores = remember(dashboard?.chores) {
        dashboard?.chores.orEmpty()
            .filter { it.state in setOf("completed", "approved", "rejected") }
            .sortedByDescending { parseInstantForSort(it.dueAt) }
            .take(2)
    }
    val myChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.MINE } }
    val myChoresDueToday = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.TODAY }
    }
    val myChoresDueThisWeek = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.THIS_WEEK }
    }
    val myChoresDueLater = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.LATER }
    }
    val unassignedChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.UNASSIGNED } }
    val otherChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.OTHERS } }
    val choresDueTodayLabel = stringResource(R.string.mobile_chores_due_today)
    val choresDueThisWeekLabel = stringResource(R.string.mobile_chores_due_this_week)
    val choresDueLaterLabel = stringResource(R.string.mobile_chores_due_later)
    val choresUnassignedLabel = stringResource(R.string.mobile_chores_unassigned)
    val choresOthersLabel = stringResource(R.string.mobile_chores_others)
    val choresHistoryLabel = stringResource(R.string.mobile_chores_history)
    val actionRequiredTitle = stringResource(R.string.mobile_action_required_title)
    val recurrenceIntervalInvalidMessage = stringResource(R.string.mobile_create_interval_days_invalid)
    val recurrenceOccurrencesInvalidMessage = stringResource(R.string.mobile_create_occurrences_invalid)
    val recurrenceEndDateRequiredMessage = stringResource(R.string.mobile_create_end_date_required)
    val effectiveCreateRecurrenceType = resolveEffectiveCreateRecurrenceType(selectedTemplate, createRecurrenceType)
    val parsedCreateRecurrenceInterval = createRecurrenceIntervalInput.trim().toIntOrNull()
    val createRecurrenceIntervalError =
        if (createRecurrenceType == "every_x_days" &&
            (createRecurrenceIntervalInput.isBlank() || parsedCreateRecurrenceInterval == null || parsedCreateRecurrenceInterval <= 0)
        ) {
            recurrenceIntervalInvalidMessage
        } else {
            null
        }
    val parsedCreateRecurrenceOccurrences = createRecurrenceOccurrencesInput.trim().toIntOrNull()
    val createRecurrenceOccurrencesError =
        if (effectiveCreateRecurrenceType != "none" && createRecurrenceEndMode == "after_occurrences" &&
            (createRecurrenceOccurrencesInput.isBlank() || parsedCreateRecurrenceOccurrences == null || parsedCreateRecurrenceOccurrences <= 0)
        ) {
            recurrenceOccurrencesInvalidMessage
        } else {
            null
        }
    val createRecurrenceEndDateError =
        if (effectiveCreateRecurrenceType != "none" && createRecurrenceEndMode == "on_date" && createRecurrenceEndsAtMillis <= createDueAtMillis) {
            recurrenceEndDateRequiredMessage
        } else {
            null
        }
    val showStatusCard =
        !pendingReconnectActionLabel.isNullOrBlank() ||
            queuedSubmissionCount > 0 ||
            isSyncingQueue ||
            !noticeMessage.isNullOrBlank() ||
            !errorMessage.isNullOrBlank()

    LaunchedEffect(templates) {
        if (templates.isNotEmpty() && templates.none { it.id == selectedTemplateId }) {
            selectedTemplateId = templates.first().id
        }
    }

    LaunchedEffect(selectedTemplate?.id) {
        val template = selectedTemplate ?: return@LaunchedEffect
        createAssignmentStrategy = template.assignmentStrategy
        val (defaultType, defaultInterval) = templateRecurrenceDefaults(template.recurrence)
        createRecurrenceType = defaultType
        createRecurrenceIntervalInput = defaultInterval.toString()
        createRecurrenceEndMode = "never"
        createRecurrenceOccurrencesInput = "3"
        createRecurrenceEndsAtMillis = defaultCreateRecurrenceEndsAtMillis(createDueAtMillis)
        createAssigneeId = null
        createVariantId = null
    }

    fun resetCreateForm() {
        createDueAtMillis = defaultCreateDueAtMillis()
        val template = selectedTemplate
        if (template != null) {
            createAssignmentStrategy = template.assignmentStrategy
            val (defaultType, defaultInterval) = templateRecurrenceDefaults(template.recurrence)
            createRecurrenceType = defaultType
            createRecurrenceIntervalInput = defaultInterval.toString()
        } else {
            createAssignmentStrategy = "round_robin"
            createRecurrenceType = "template"
            createRecurrenceIntervalInput = "7"
        }
        createRecurrenceEndMode = "never"
        createRecurrenceOccurrencesInput = "3"
        createRecurrenceEndsAtMillis = defaultCreateRecurrenceEndsAtMillis(createDueAtMillis)
        createAssigneeId = null
        createVariantId = null
        templateDropdownExpanded = false
        recurrenceTypeDropdownExpanded = false
        assignmentStrategyDropdownExpanded = false
        assigneeDropdownExpanded = false
        variantDropdownExpanded = false
    }

    LaunchedEffect(createSuccessCounter) {
        if (createSuccessCounter > 0) {
            showCreateSuccessDialog = true
        }
    }

    val datePickerDialog = remember(context, createDueAtMillis) {
        val zoned = Instant.ofEpochMilli(createDueAtMillis).atZone(ZoneId.systemDefault())
        DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                val current = Instant.ofEpochMilli(createDueAtMillis).atZone(ZoneId.systemDefault())
                createDueAtMillis = current
                    .withYear(year)
                    .withMonth(month + 1)
                    .withDayOfMonth(dayOfMonth)
                    .toInstant()
                    .toEpochMilli()
            },
            zoned.year,
            zoned.monthValue - 1,
            zoned.dayOfMonth
        )
    }

    val timePickerDialog = remember(context, createDueAtMillis) {
        val zoned = Instant.ofEpochMilli(createDueAtMillis).atZone(ZoneId.systemDefault())
        TimePickerDialog(
            context,
            { _, hourOfDay, minute ->
                val current = Instant.ofEpochMilli(createDueAtMillis).atZone(ZoneId.systemDefault())
                createDueAtMillis = current
                    .withHour(hourOfDay)
                    .withMinute(minute)
                    .withSecond(0)
                    .withNano(0)
                    .toInstant()
                    .toEpochMilli()
            },
            zoned.hour,
            zoned.minute,
            true
        )
    }

    val recurrenceEndDatePickerDialog = remember(context, createRecurrenceEndsAtMillis) {
        val zoned = Instant.ofEpochMilli(createRecurrenceEndsAtMillis).atZone(ZoneId.systemDefault())
        DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                val current = Instant.ofEpochMilli(createRecurrenceEndsAtMillis).atZone(ZoneId.systemDefault())
                createRecurrenceEndsAtMillis = current
                    .withYear(year)
                    .withMonth(month + 1)
                    .withDayOfMonth(dayOfMonth)
                    .toInstant()
                    .toEpochMilli()
            },
            zoned.year,
            zoned.monthValue - 1,
            zoned.dayOfMonth
        )
    }

    val recurrenceEndTimePickerDialog = remember(context, createRecurrenceEndsAtMillis) {
        val zoned = Instant.ofEpochMilli(createRecurrenceEndsAtMillis).atZone(ZoneId.systemDefault())
        TimePickerDialog(
            context,
            { _, hourOfDay, minute ->
                val current = Instant.ofEpochMilli(createRecurrenceEndsAtMillis).atZone(ZoneId.systemDefault())
                createRecurrenceEndsAtMillis = current
                    .withHour(hourOfDay)
                    .withMinute(minute)
                    .withSecond(0)
                    .withNano(0)
                    .toInstant()
                    .toEpochMilli()
            },
            zoned.hour,
            zoned.minute,
            true
        )
    }

    if (showCreateSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showCreateSuccessDialog = false
                activeTab = MobileDashboardTab.CHORES
            },
            title = { Text(stringResource(R.string.mobile_create_success_title)) },
            text = { Text(stringResource(R.string.mobile_create_success_body)) },
            confirmButton = {
                Button(onClick = {
                    showCreateSuccessDialog = false
                    activeTab = MobileDashboardTab.CHORES
                }) {
                    Text(stringResource(R.string.mobile_create_success_done))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = {
                    showCreateSuccessDialog = false
                    activeTab = MobileDashboardTab.CREATE
                    resetCreateForm()
                }) {
                    Text(stringResource(R.string.mobile_create_success_create_another))
                }
            }
        )
    }

    if (!validationDialogMessage.isNullOrBlank()) {
        AlertDialog(
            onDismissRequest = onDismissValidationDialog,
            title = { Text(actionRequiredTitle) },
            text = { Text(validationDialogMessage) },
            confirmButton = {
                Button(onClick = onDismissValidationDialog) {
                    Text(stringResource(R.string.mobile_validation_confirm))
                }
            }
        )
    }

    val startConfirmationChore = remember(sortedChores, startConfirmationChoreId) {
        sortedChores.firstOrNull { it.id == startConfirmationChoreId }
    }

    if (startConfirmationChore != null) {
        AlertDialog(
            onDismissRequest = { startConfirmationChoreId = null },
            title = { Text(stringResource(R.string.mobile_start_confirm_title)) },
            text = {
                Text(stringResource(R.string.mobile_start_confirm_body, startConfirmationChore.title))
            },
            confirmButton = {
                Button(onClick = {
                    val choreId = startConfirmationChore.id
                    startConfirmationChoreId = null
                    onStartChore(choreId)
                }) {
                    Text(stringResource(R.string.mobile_start_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { startConfirmationChoreId = null }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    val takeoverConfirmationChore = remember(sortedChores, takeoverConfirmationChoreId) {
        sortedChores.firstOrNull { it.id == takeoverConfirmationChoreId }
    }

    if (takeoverConfirmationChore != null) {
        val assigneeName = takeoverConfirmationChore.assigneeDisplayName
            ?.let { firstNameFromDisplayName(it) ?: it }
        AlertDialog(
            onDismissRequest = { takeoverConfirmationChoreId = null },
            title = { Text(stringResource(R.string.mobile_takeover_confirm_title)) },
            text = {
                Text(
                    if (assigneeName != null) {
                        stringResource(R.string.mobile_takeover_confirm_body_assigned, takeoverConfirmationChore.title, assigneeName)
                    } else {
                        stringResource(R.string.mobile_takeover_confirm_body, takeoverConfirmationChore.title)
                    }
                )
            },
            confirmButton = {
                Button(onClick = {
                    val choreId = takeoverConfirmationChore.id
                    takeoverConfirmationChoreId = null
                    onTakeOverChore(choreId)
                }) {
                    Text(stringResource(R.string.mobile_takeover_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { takeoverConfirmationChoreId = null }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    val submitConfirmationChore = remember(sortedChores, submitConfirmationChoreId) {
        sortedChores.firstOrNull { it.id == submitConfirmationChoreId }
    }

    if (submitConfirmationChore != null) {
        AlertDialog(
            onDismissRequest = {
                submitConfirmationChoreId = null
            },
            title = { Text(stringResource(R.string.mobile_submit_confirm_title)) },
            text = {
                Text(
                    text = stringResource(
                        R.string.mobile_submit_confirm_body,
                        submitConfirmationChore.title
                    )
                )
            },
            confirmButton = {
                Button(onClick = {
                    val choreId = submitConfirmationChore.id
                    submitConfirmationChoreId = null
                    onSubmitChore(choreId)
                }) {
                    Text(stringResource(R.string.mobile_submit_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { submitConfirmationChoreId = null }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    val requestTakeoverChore = remember(sortedChores, requestTakeoverChoreId) {
        sortedChores.firstOrNull { it.id == requestTakeoverChoreId }
    }

    if (requestTakeoverChore != null && supportsTakeoverRequests) {
        AlertDialog(
            onDismissRequest = {
                requestTakeoverChoreId = null
                requestTakeoverMemberId = null
            },
            title = { Text(stringResource(R.string.mobile_request_takeover_dialog_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = stringResource(
                            R.string.mobile_request_takeover_dialog_body,
                            requestTakeoverChore.title
                        )
                    )
                    Text(
                        text = stringResource(R.string.mobile_request_takeover_pick_member),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    eligibleTakeoverMembers.forEach { member ->
                        val selected = requestTakeoverMemberId == member.id
                        if (selected) {
                            Button(
                                onClick = { requestTakeoverMemberId = member.id },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(member.displayName)
                            }
                        } else {
                            OutlinedButton(
                                onClick = { requestTakeoverMemberId = member.id },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(member.displayName)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val selectedMemberId = requestTakeoverMemberId ?: return@Button
                        onRequestTakeover(requestTakeoverChore.id, selectedMemberId)
                        requestTakeoverChoreId = null
                        requestTakeoverMemberId = null
                    },
                    enabled = requestTakeoverMemberId != null && activeTakeoverRequestAction == null
                ) {
                    Text(
                        stringResource(
                            if (activeTakeoverRequestAction?.startsWith("request:${requestTakeoverChore.id}:") == true) {
                                R.string.mobile_request_takeover_sending
                            } else {
                                R.string.mobile_request_takeover_confirm
                            }
                        )
                    )
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        requestTakeoverChoreId = null
                        requestTakeoverMemberId = null
                    }
                ) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    Scaffold(
        bottomBar = {
            BoxWithConstraints(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                val isTablet = isTabletWidth(maxWidth)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(if (isTablet) Modifier.widthIn(max = 760.dp) else Modifier),
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        MobileTabButton(
                            modifier = Modifier.weight(1f),
                            selected = activeTab == MobileDashboardTab.CHORES,
                            label = stringResource(R.string.mobile_tab_chores),
                            icon = Icons.Rounded.AssignmentTurnedIn,
                            onClick = {
                                activeTab = MobileDashboardTab.CHORES
                                expandedChoreIds = emptySet()
                            }
                        )
                        MobileCenterTabButton(
                            modifier = Modifier.weight(1.1f),
                            selected = activeTab == MobileDashboardTab.CREATE,
                            label = stringResource(R.string.mobile_tab_create),
                            icon = Icons.Rounded.AddCircle,
                            onClick = {
                                activeTab = MobileDashboardTab.CREATE
                                expandedChoreIds = emptySet()
                            }
                        )
                        MobileTabButton(
                            modifier = Modifier.weight(1f),
                            selected = activeTab == MobileDashboardTab.SETTINGS,
                            label = stringResource(R.string.mobile_tab_settings),
                            icon = Icons.Rounded.Tune,
                            onClick = { activeTab = MobileDashboardTab.SETTINGS }
                        )
                    }
                }
            }
        }
    ) { padding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primaryContainer,
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(padding)
        ) {
            val isTablet = isTabletWidth(maxWidth)
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = if (isTablet) 28.dp else 20.dp, vertical = 16.dp)
                        .then(if (isTablet) Modifier.widthIn(max = 1280.dp).align(Alignment.TopCenter) else Modifier),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
            if (activeTab == MobileDashboardTab.CHORES) {
                if (sortedChores.isEmpty() && historicChores.isEmpty()) {
                    item { Text(text = stringResource(R.string.mobile_no_chores), style = MaterialTheme.typography.bodyMedium) }
                }
                if (isTablet) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(18.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(
                                modifier = Modifier.weight(1.55f),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                if (supportsTakeoverRequests && incomingTakeoverRequests.isNotEmpty()) {
                                    TakeoverRequestsPanel(
                                        requests = incomingTakeoverRequests,
                                        activeTakeoverRequestAction = activeTakeoverRequestAction,
                                        onApproveRequest = { requestId -> onRespondToTakeoverRequest(requestId, true) },
                                        onDeclineRequest = { requestId -> onRespondToTakeoverRequest(requestId, false) }
                                    )
                                }
                                ChoreSectionColumn(chores = myChoresDueToday, title = choresDueTodayLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                                ChoreSectionColumn(chores = myChoresDueThisWeek, title = choresDueThisWeekLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                                ChoreSectionColumn(chores = myChoresDueLater, title = choresDueLaterLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                                ChoreSectionColumn(chores = unassignedChores, title = choresUnassignedLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                                ChoreSectionColumn(chores = otherChores, title = choresOthersLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                            }
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                HistoricChoreSectionColumn(
                                    chores = historicChores,
                                    title = choresHistoryLabel,
                                    expandedChoreIds = expandedHistoricChoreIds,
                                    onExpandedChange = { choreId ->
                                        expandedHistoricChoreIds = if (expandedHistoricChoreIds.contains(choreId))
                                            expandedHistoricChoreIds - choreId else expandedHistoricChoreIds + choreId
                                    }
                                )
                                if (showStatusCard) {
                                    DashboardStatusCard(
                                        modifier = Modifier.fillMaxWidth(),
                                        isSyncingQueue = isSyncingQueue,
                                        errorMessage = errorMessage,
                                        noticeMessage = noticeMessage,
                                        pendingReconnectActionLabel = pendingReconnectActionLabel,
                                        queuedSubmissionCount = queuedSubmissionCount
                                    )
                                }
                            }
                        }
                    }
                } else {
                    if (supportsTakeoverRequests && incomingTakeoverRequests.isNotEmpty()) {
                        item {
                            TakeoverRequestsPanel(
                                requests = incomingTakeoverRequests,
                                activeTakeoverRequestAction = activeTakeoverRequestAction,
                                onApproveRequest = { requestId -> onRespondToTakeoverRequest(requestId, true) },
                                onDeclineRequest = { requestId -> onRespondToTakeoverRequest(requestId, false) }
                            )
                        }
                    }
                    choreSection(chores = myChoresDueToday, title = choresDueTodayLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                    choreSection(chores = myChoresDueThisWeek, title = choresDueThisWeekLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                    choreSection(chores = myChoresDueLater, title = choresDueLaterLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                    choreSection(chores = unassignedChores, title = choresUnassignedLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                    choreSection(chores = otherChores, title = choresOthersLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId })
                    historicChoreSection(
                        chores = historicChores,
                        title = choresHistoryLabel,
                        expandedChoreIds = expandedHistoricChoreIds,
                        onExpandedChange = { choreId ->
                            expandedHistoricChoreIds = if (expandedHistoricChoreIds.contains(choreId))
                                expandedHistoricChoreIds - choreId else expandedHistoricChoreIds + choreId
                        }
                    )
                    if (showStatusCard) {
                        item {
                            DashboardStatusCard(
                                isSyncingQueue = isSyncingQueue,
                                errorMessage = errorMessage,
                                noticeMessage = noticeMessage,
                                pendingReconnectActionLabel = pendingReconnectActionLabel,
                                queuedSubmissionCount = queuedSubmissionCount
                            )
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.CREATE) {
                if (!isCreatorRole) {
                    item { Text(text = stringResource(R.string.mobile_create_no_permission), style = MaterialTheme.typography.bodyMedium) }
                } else if (templates.isEmpty()) {
                    item { Text(text = stringResource(R.string.mobile_create_no_templates), style = MaterialTheme.typography.bodyMedium) }
                } else {
                    item {
                        if (isTablet) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(18.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    CreateTemplateAndSchedulePanel(
                                        selectedTemplate = selectedTemplate,
                                        templateDropdownExpanded = templateDropdownExpanded,
                                        onTemplateDropdownExpandedChange = { templateDropdownExpanded = it },
                                        onTemplateSelected = {
                                            selectedTemplateId = it
                                            templateDropdownExpanded = false
                                        },
                                        templates = templates,
                                        createDueAtMillis = createDueAtMillis,
                                        onPickDate = { datePickerDialog.show() },
                                        onPickTime = { timePickerDialog.show() }
                                    )
                                    CreateRecurrencePanel(
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceIntervalInput = createRecurrenceIntervalInput,
                                        createRecurrenceIntervalError = createRecurrenceIntervalError,
                                        recurrenceTypeDropdownExpanded = recurrenceTypeDropdownExpanded,
                                        onRecurrenceDropdownExpandedChange = { recurrenceTypeDropdownExpanded = it },
                                        onRecurrenceTypeSelected = {
                                            createRecurrenceType = it
                                            recurrenceTypeDropdownExpanded = false
                                        },
                                        onRecurrenceIntervalChange = { v ->
                                            if (v.all(Char::isDigit)) {
                                                createRecurrenceIntervalInput = v
                                            }
                                        }
                                    )
                                    CreateRecurrenceEndPanel(
                                        selectedTemplate = selectedTemplate,
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceEndMode = createRecurrenceEndMode,
                                        createRecurrenceOccurrencesInput = createRecurrenceOccurrencesInput,
                                        createRecurrenceOccurrencesError = createRecurrenceOccurrencesError,
                                        createRecurrenceEndsAtMillis = createRecurrenceEndsAtMillis,
                                        createRecurrenceEndDateError = createRecurrenceEndDateError,
                                        onRecurrenceEndModeSelected = { createRecurrenceEndMode = it },
                                        onRecurrenceOccurrencesChange = { value ->
                                            if (value.all(Char::isDigit)) {
                                                createRecurrenceOccurrencesInput = value
                                            }
                                        },
                                        onPickEndDate = { recurrenceEndDatePickerDialog.show() },
                                        onPickEndTime = { recurrenceEndTimePickerDialog.show() }
                                    )
                                }
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    CreateAssignmentPanel(
                                        createAssignmentStrategy = createAssignmentStrategy,
                                        assignmentStrategyDropdownExpanded = assignmentStrategyDropdownExpanded,
                                        onAssignmentDropdownExpandedChange = { assignmentStrategyDropdownExpanded = it },
                                        onAssignmentStrategySelected = { strategy ->
                                            createAssignmentStrategy = strategy
                                            if (strategy != "manual_default_assignee") createAssigneeId = null
                                            assignmentStrategyDropdownExpanded = false
                                        },
                                        createAssigneeId = createAssigneeId,
                                        assigneeDropdownExpanded = assigneeDropdownExpanded,
                                        onAssigneeDropdownExpandedChange = { assigneeDropdownExpanded = it },
                                        onAssigneeSelected = {
                                            createAssigneeId = it
                                            assigneeDropdownExpanded = false
                                        },
                                        members = members
                                    )
                                    CreateVariantPanel(
                                        selectedTemplate = selectedTemplate,
                                        createVariantId = createVariantId,
                                        variantDropdownExpanded = variantDropdownExpanded,
                                        onVariantDropdownExpandedChange = { variantDropdownExpanded = it },
                                        onVariantSelected = {
                                            createVariantId = it
                                            variantDropdownExpanded = false
                                        }
                                    )
                                    CreateSubmitPanel(
                                        selectedTemplate = selectedTemplate,
                                        createDueAtMillis = createDueAtMillis,
                                        createAssigneeId = createAssigneeId,
                                        createAssignmentStrategy = createAssignmentStrategy,
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceInterval = parsedCreateRecurrenceInterval,
                                        createRecurrenceIntervalError = createRecurrenceIntervalError,
                                        createRecurrenceEndMode = createRecurrenceEndMode,
                                        createRecurrenceOccurrences = parsedCreateRecurrenceOccurrences,
                                        createRecurrenceOccurrencesError = createRecurrenceOccurrencesError,
                                        createRecurrenceEndsAtMillis = createRecurrenceEndsAtMillis,
                                        createRecurrenceEndDateError = createRecurrenceEndDateError,
                                        createVariantId = createVariantId,
                                        activeCreateAction = activeCreateAction,
                                        onCreateChore = onCreateChore
                                    )
                                }
                            }
                        } else {
                            Card(shape = RoundedCornerShape(24.dp)) {
                                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                    CreateTemplateAndSchedulePanel(
                                        selectedTemplate = selectedTemplate,
                                        templateDropdownExpanded = templateDropdownExpanded,
                                        onTemplateDropdownExpandedChange = { templateDropdownExpanded = it },
                                        onTemplateSelected = {
                                            selectedTemplateId = it
                                            templateDropdownExpanded = false
                                        },
                                        templates = templates,
                                        createDueAtMillis = createDueAtMillis,
                                        onPickDate = { datePickerDialog.show() },
                                        onPickTime = { timePickerDialog.show() }
                                    )
                                    CreateRecurrencePanel(
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceIntervalInput = createRecurrenceIntervalInput,
                                        createRecurrenceIntervalError = createRecurrenceIntervalError,
                                        recurrenceTypeDropdownExpanded = recurrenceTypeDropdownExpanded,
                                        onRecurrenceDropdownExpandedChange = { recurrenceTypeDropdownExpanded = it },
                                        onRecurrenceTypeSelected = {
                                            createRecurrenceType = it
                                            recurrenceTypeDropdownExpanded = false
                                        },
                                        onRecurrenceIntervalChange = { v ->
                                            if (v.all(Char::isDigit)) {
                                                createRecurrenceIntervalInput = v
                                            }
                                        }
                                    )
                                    CreateRecurrenceEndPanel(
                                        selectedTemplate = selectedTemplate,
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceEndMode = createRecurrenceEndMode,
                                        createRecurrenceOccurrencesInput = createRecurrenceOccurrencesInput,
                                        createRecurrenceOccurrencesError = createRecurrenceOccurrencesError,
                                        createRecurrenceEndsAtMillis = createRecurrenceEndsAtMillis,
                                        createRecurrenceEndDateError = createRecurrenceEndDateError,
                                        onRecurrenceEndModeSelected = { createRecurrenceEndMode = it },
                                        onRecurrenceOccurrencesChange = { value ->
                                            if (value.all(Char::isDigit)) {
                                                createRecurrenceOccurrencesInput = value
                                            }
                                        },
                                        onPickEndDate = { recurrenceEndDatePickerDialog.show() },
                                        onPickEndTime = { recurrenceEndTimePickerDialog.show() }
                                    )
                                    CreateAssignmentPanel(
                                        createAssignmentStrategy = createAssignmentStrategy,
                                        assignmentStrategyDropdownExpanded = assignmentStrategyDropdownExpanded,
                                        onAssignmentDropdownExpandedChange = { assignmentStrategyDropdownExpanded = it },
                                        onAssignmentStrategySelected = { strategy ->
                                            createAssignmentStrategy = strategy
                                            if (strategy != "manual_default_assignee") createAssigneeId = null
                                            assignmentStrategyDropdownExpanded = false
                                        },
                                        createAssigneeId = createAssigneeId,
                                        assigneeDropdownExpanded = assigneeDropdownExpanded,
                                        onAssigneeDropdownExpandedChange = { assigneeDropdownExpanded = it },
                                        onAssigneeSelected = {
                                            createAssigneeId = it
                                            assigneeDropdownExpanded = false
                                        },
                                        members = members
                                    )
                                    CreateVariantPanel(
                                        selectedTemplate = selectedTemplate,
                                        createVariantId = createVariantId,
                                        variantDropdownExpanded = variantDropdownExpanded,
                                        onVariantDropdownExpandedChange = { variantDropdownExpanded = it },
                                        onVariantSelected = {
                                            createVariantId = it
                                            variantDropdownExpanded = false
                                        }
                                    )
                                    CreateSubmitPanel(
                                        selectedTemplate = selectedTemplate,
                                        createDueAtMillis = createDueAtMillis,
                                        createAssigneeId = createAssigneeId,
                                        createAssignmentStrategy = createAssignmentStrategy,
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceInterval = parsedCreateRecurrenceInterval,
                                        createRecurrenceIntervalError = createRecurrenceIntervalError,
                                        createRecurrenceEndMode = createRecurrenceEndMode,
                                        createRecurrenceOccurrences = parsedCreateRecurrenceOccurrences,
                                        createRecurrenceOccurrencesError = createRecurrenceOccurrencesError,
                                        createRecurrenceEndsAtMillis = createRecurrenceEndsAtMillis,
                                        createRecurrenceEndDateError = createRecurrenceEndDateError,
                                        createVariantId = createVariantId,
                                        activeCreateAction = activeCreateAction,
                                        onCreateChore = onCreateChore
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.SETTINGS) {
                item { SectionIntro(title = stringResource(R.string.mobile_settings_title), body = stringResource(R.string.mobile_settings_hint)) }
                if (isTablet) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(18.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            SettingsSectionCard(modifier = Modifier.weight(1f), icon = Icons.Rounded.Tune, title = stringResource(R.string.mobile_settings_appearance)) {
                                SettingsAppearanceContent(themeMode = themeMode, onThemeModeChange = onThemeModeChange, languageTag = languageTag, onLanguageTagChange = onLanguageTagChange)
                            }
                            SettingsSectionCard(modifier = Modifier.weight(1f), icon = Icons.Rounded.Smartphone, title = stringResource(R.string.mobile_settings_device)) {
                                SettingsDeviceContent(currentDevice = currentDevice, installationId = installationId, notificationsPermissionGranted = notificationsPermissionGranted, isBusy = isBusy, activeDeviceAction = activeDeviceAction, onRefresh = onRefresh, onRequestNotificationPermission = onRequestNotificationPermission, onRemoveNotificationDevice = onRemoveNotificationDevice)
                            }
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(18.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            SettingsSectionCard(modifier = Modifier.weight(1f), icon = Icons.Rounded.Language, title = stringResource(R.string.mobile_settings_release)) {
                                SettingsReleaseContent(currentReleaseLabel = currentReleaseLabel, serverReleaseLabel = serverReleaseLabel, serverUrl = serverUrl, availableUpdate = availableUpdate, onDismissUpdate = onDismissUpdate)
                            }
                            SettingsSectionCard(modifier = Modifier.weight(1f), icon = Icons.Rounded.DarkMode, title = stringResource(R.string.mobile_settings_actions)) {
                                SettingsActionsContent(isBusy = isBusy, onRefresh = onRefresh, onLogout = onLogout)
                            }
                        }
                    }
                } else {
                    item {
                        SettingsSectionCard(icon = Icons.Rounded.Tune, title = stringResource(R.string.mobile_settings_appearance)) {
                            SettingsAppearanceContent(themeMode = themeMode, onThemeModeChange = onThemeModeChange, languageTag = languageTag, onLanguageTagChange = onLanguageTagChange)
                        }
                    }
                    item {
                        SettingsSectionCard(icon = Icons.Rounded.Smartphone, title = stringResource(R.string.mobile_settings_device)) {
                            SettingsDeviceContent(currentDevice = currentDevice, installationId = installationId, notificationsPermissionGranted = notificationsPermissionGranted, isBusy = isBusy, activeDeviceAction = activeDeviceAction, onRefresh = onRefresh, onRequestNotificationPermission = onRequestNotificationPermission, onRemoveNotificationDevice = onRemoveNotificationDevice)
                        }
                    }
                    item {
                        SettingsSectionCard(icon = Icons.Rounded.Language, title = stringResource(R.string.mobile_settings_release)) {
                            SettingsReleaseContent(currentReleaseLabel = currentReleaseLabel, serverReleaseLabel = serverReleaseLabel, serverUrl = serverUrl, availableUpdate = availableUpdate, onDismissUpdate = onDismissUpdate)
                        }
                    }
                    item {
                        SettingsSectionCard(icon = Icons.Rounded.DarkMode, title = stringResource(R.string.mobile_settings_actions)) {
                            SettingsActionsContent(isBusy = isBusy, onRefresh = onRefresh, onLogout = onLogout)
                        }
                    }
                }
            }
                }

                if (activeTab == MobileDashboardTab.CHORES && showDashboardSyncNotice) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                start = if (isTablet) 28.dp else 20.dp,
                                end = if (isTablet) 28.dp else 20.dp,
                                top = 12.dp
                            )
                            .then(if (isTablet) Modifier.widthIn(max = 1280.dp).align(Alignment.TopCenter) else Modifier)
                    ) {
                        ChoreConnectionBanner(
                            message = stringResource(R.string.mobile_sync_disconnected)
                        )
                    }
                }
            }
        }
    }
}
@Composable
private fun MobileTabButton(
    modifier: Modifier = Modifier,
    selected: Boolean,
    label: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    val iconTint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    val chipColor = if (selected) {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.9f)
    }
    TextButton(
        modifier = modifier,
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
        colors = ButtonDefaults.textButtonColors(contentColor = iconTint)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(
                modifier = Modifier.size(34.dp).background(chipColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(18.dp)
                )
            }
            Text(
                text = label,
                color = iconTint,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun MobileCenterTabButton(
    modifier: Modifier = Modifier,
    selected: Boolean,
    label: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    val containerColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.82f)
    }
    val iconTint = MaterialTheme.colorScheme.onPrimary

    TextButton(
        modifier = modifier,
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier.size(52.dp).background(containerColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp)
                )
            }
            Text(
                text = label,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun DashboardStatusCard(
    modifier: Modifier = Modifier,
    isSyncingQueue: Boolean,
    errorMessage: String?,
    noticeMessage: String?,
    pendingReconnectActionLabel: String?,
    queuedSubmissionCount: Int
) {
    Card(modifier = modifier, shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (!pendingReconnectActionLabel.isNullOrBlank()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(
                        text = stringResource(
                            R.string.mobile_sync_reconnecting_action_status,
                            pendingReconnectActionLabel
                        ),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
            if (queuedSubmissionCount > 0 || isSyncingQueue) {
                Text(
                    text = if (isSyncingQueue) {
                        stringResource(R.string.mobile_syncing_queue)
                    } else {
                        stringResource(R.string.mobile_queued_submissions, queuedSubmissionCount)
                    },
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (!noticeMessage.isNullOrBlank()) {
                Text(text = noticeMessage, color = MaterialTheme.colorScheme.primary)
            }
            if (!errorMessage.isNullOrBlank()) {
                Text(text = errorMessage, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun ChoreConnectionBanner(message: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SectionIntro(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Text(text = body, style = MaterialTheme.typography.bodyMedium)
    }
}

private fun LazyListScope.choreSection(
    chores: List<MobileChore>, title: String, currentUserId: String?, currentUserRole: String?, supportsTakeoverRequests: Boolean, expandedChoreIds: Set<String>, onExpandedChange: (String) -> Unit,
    activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?, activeCloseCycleAction: String?, activeTakeoverRequestAction: String?, outgoingTakeoverRequestsByChoreId: Map<String, MobileTakeoverRequest>, submitSelections: Map<String, Set<String>>, selectedProofUris: Map<String, List<String>>,
    onApprove: (String) -> Unit, onReject: (String) -> Unit, onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onTakeProofPhoto: (String) -> Unit, onStartChore: (String) -> Unit, onCloseChoreCycle: (String) -> Unit, onTakeOverChore: (String) -> Unit, onRequestTakeover: (String) -> Unit, onSubmitChore: (String) -> Unit
) {
    if (chores.isEmpty()) return
    val tone = when (chores.firstOrNull()?.let { resolveChoreSection(it, currentUserId) }) {
        MobileChoreSection.MINE -> MobileChoreSectionTone.MINE
        MobileChoreSection.UNASSIGNED -> MobileChoreSectionTone.UNASSIGNED
        MobileChoreSection.OTHERS -> MobileChoreSectionTone.OTHERS
        null -> MobileChoreSectionTone.UNASSIGNED
    }
    item {
        ChoreSectionPanel(title = title, count = chores.size, tone = tone) {
            chores.forEach { chore ->
                ChoreCard(chore = chore, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expanded = expandedChoreIds.contains(chore.id), activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequest = outgoingTakeoverRequestsByChoreId[chore.id], selectedChecklistIds = submitSelections[chore.id] ?: chore.completedChecklistIds.toSet(), selectedProofCount = selectedProofUris[chore.id]?.size ?: 0, onExpandedChange = { onExpandedChange(chore.id) }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = onStartChore, onCloseChoreCycle = onCloseChoreCycle, onTakeOverChore = onTakeOverChore, onRequestTakeover = onRequestTakeover, onSubmitChore = onSubmitChore)
            }
        }
    }
}
private fun LazyListScope.historicChoreSection(
    chores: List<MobileChore>,
    title: String,
    expandedChoreIds: Set<String>,
    onExpandedChange: (String) -> Unit
) {
    if (chores.isEmpty()) return
    item {
        ChoreSectionPanel(title = title, count = chores.size, tone = MobileChoreSectionTone.HISTORIC) {
            chores.forEach { chore ->
                HistoricChoreCard(
                    chore = chore,
                    expanded = expandedChoreIds.contains(chore.id),
                    onExpandedChange = { onExpandedChange(chore.id) }
                )
            }
        }
    }
}

@Composable
private fun ChoreSectionColumn(
    chores: List<MobileChore>,
    title: String,
    currentUserId: String?,
    currentUserRole: String?,
    supportsTakeoverRequests: Boolean,
    expandedChoreIds: Set<String>,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeTakeoverRequestAction: String?,
    outgoingTakeoverRequestsByChoreId: Map<String, MobileTakeoverRequest>,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onExpandedChange: (String) -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    onPickProofs: (String) -> Unit,
    onTakeProofPhoto: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String) -> Unit,
    onSubmitChore: (String) -> Unit
) {
    if (chores.isEmpty()) return
    val tone = when (chores.firstOrNull()?.let { resolveChoreSection(it, currentUserId) }) {
        MobileChoreSection.MINE -> MobileChoreSectionTone.MINE
        MobileChoreSection.UNASSIGNED -> MobileChoreSectionTone.UNASSIGNED
        MobileChoreSection.OTHERS -> MobileChoreSectionTone.OTHERS
        null -> MobileChoreSectionTone.UNASSIGNED
    }
    ChoreSectionPanel(title = title, count = chores.size, tone = tone) {
        chores.forEach { chore ->
            ChoreCard(
                chore = chore,
                currentUserId = currentUserId,
                currentUserRole = currentUserRole,
                supportsTakeoverRequests = supportsTakeoverRequests,
                expanded = expandedChoreIds.contains(chore.id),
                activeReviewAction = activeReviewAction,
                activeStartAction = activeStartAction,
                activeSubmitAction = activeSubmitAction,
                activeCloseCycleAction = activeCloseCycleAction,
                activeTakeoverRequestAction = activeTakeoverRequestAction,
                outgoingTakeoverRequest = outgoingTakeoverRequestsByChoreId[chore.id],
                selectedChecklistIds = submitSelections[chore.id] ?: chore.completedChecklistIds.toSet(),
                selectedProofCount = selectedProofUris[chore.id]?.size ?: 0,
                onExpandedChange = { onExpandedChange(chore.id) },
                onApprove = onApprove,
                onReject = onReject,
                onToggleChecklistItem = onToggleChecklistItem,
                onPickProofs = onPickProofs,
                onTakeProofPhoto = onTakeProofPhoto,
                onStartChore = onStartChore,
                onCloseChoreCycle = onCloseChoreCycle,
                onTakeOverChore = onTakeOverChore,
                onRequestTakeover = onRequestTakeover,
                onSubmitChore = onSubmitChore
            )
        }
    }
}

@Composable
private fun HistoricChoreSectionColumn(
    chores: List<MobileChore>,
    title: String,
    expandedChoreIds: Set<String>,
    onExpandedChange: (String) -> Unit
) {
    if (chores.isEmpty()) return
    ChoreSectionPanel(title = title, count = chores.size, tone = MobileChoreSectionTone.HISTORIC) {
        chores.forEach { chore ->
            HistoricChoreCard(
                chore = chore,
                expanded = expandedChoreIds.contains(chore.id),
                onExpandedChange = { onExpandedChange(chore.id) }
            )
        }
    }
}

@Composable
private fun ChoreSectionPanel(
    title: String,
    count: Int,
    tone: MobileChoreSectionTone,
    content: @Composable ColumnScope.() -> Unit
) {
    val (containerColor, contentColor, badgeColor, badgeContentColor, borderColor) = rememberSectionToneColors(tone)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.25.dp, borderColor),
        colors = CardDefaults.cardColors(
            containerColor = containerColor,
            contentColor = contentColor
        )
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Surface(
                    shape = CircleShape,
                    color = badgeColor
                ) {
                    Text(
                        text = count.toString(),
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = badgeContentColor,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            content()
        }
    }
}

@Composable
private fun rememberSectionToneColors(tone: MobileChoreSectionTone): SectionToneColors {
    val isDarkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f

    return if (isDarkTheme) {
        when (tone) {
            MobileChoreSectionTone.MINE -> SectionToneColors(
                container = Color(0xFF24354A),
                content = Color(0xFFF7F5FF),
                badgeContainer = Color(0xFF79B9EE),
                badgeContent = Color(0xFF132235),
                borderColor = Color(0xFF5C84B3)
            )
            MobileChoreSectionTone.UNASSIGNED -> SectionToneColors(
                container = Color(0xFF3A3352),
                content = Color(0xFFF7F3FF),
                badgeContainer = Color(0xFFB8A3F0),
                badgeContent = Color(0xFF241B3A),
                borderColor = Color(0xFF8F7AC8)
            )
            MobileChoreSectionTone.OTHERS -> SectionToneColors(
                container = Color(0xFF2E2E63),
                content = Color(0xFFF5F3FF),
                badgeContainer = Color(0xFF9BA7FF),
                badgeContent = Color(0xFF1A1F48),
                borderColor = Color(0xFF717DDB)
            )
            MobileChoreSectionTone.HISTORIC -> SectionToneColors(
                container = Color(0xFF222A38),
                content = Color(0xFFF0F3F8),
                badgeContainer = Color(0xFF5E708D),
                badgeContent = Color(0xFFF0F3F8),
                borderColor = Color(0xFF4D5A73)
            )
        }
    } else {
        when (tone) {
            MobileChoreSectionTone.MINE -> SectionToneColors(
                container = Color(0xFFF0E1C5),
                content = MaterialTheme.colorScheme.onSurface,
                badgeContainer = Color(0xFFD3B07B),
                badgeContent = Color(0xFF2D2110),
                borderColor = Color(0xFFD0B283)
            )
            MobileChoreSectionTone.UNASSIGNED -> SectionToneColors(
                container = Color(0xFFF7ECD5),
                content = MaterialTheme.colorScheme.onSurface,
                badgeContainer = Color(0xFFE4C78D),
                badgeContent = Color(0xFF35270E),
                borderColor = Color(0xFFE0C58F)
            )
            MobileChoreSectionTone.OTHERS -> SectionToneColors(
                container = Color(0xFFE6D5BA),
                content = MaterialTheme.colorScheme.onSurface,
                badgeContainer = Color(0xFFCFAE7A),
                badgeContent = Color(0xFF302110),
                borderColor = Color(0xFFC9AA78)
            )
            MobileChoreSectionTone.HISTORIC -> SectionToneColors(
                container = Color(0xFFF2EADF),
                content = MaterialTheme.colorScheme.onSurface,
                badgeContainer = Color(0xFFD8C8B3),
                badgeContent = MaterialTheme.colorScheme.onSurface,
                borderColor = Color(0xFFD5C6B2)
            )
        }
    }
}

private data class SectionToneColors(
    val container: Color,
    val content: Color,
    val badgeContainer: Color,
    val badgeContent: Color,
    val borderColor: Color
)

@Composable
private fun CompactChoreMeta(
    dueAt: String,
    assignmentLabel: String? = null,
    subtypeLabel: String? = null,
    requirePhotoProof: Boolean,
    includeWeekdayInDueDate: Boolean = true,
    dueLabelResId: Int = R.string.mobile_due_at,
    modifier: Modifier = Modifier
) {
    val supportingParts = buildList {
        subtypeLabel?.takeIf { it.isNotBlank() }?.let(::add)
        assignmentLabel?.takeIf { it.isNotBlank() }?.let(::add)
        if (requirePhotoProof) add(stringResource(R.string.mobile_photo_required_hint))
    }
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(1.dp)
    ) {
        if (supportingParts.isNotEmpty()) {
            Text(
                text = supportingParts.joinToString(" • "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(
            text = stringResource(
                dueLabelResId,
                if (includeWeekdayInDueDate) formatDueAtForCard(dueAt) else formatDueAtForHistoricCard(dueAt)
            ),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun TakeoverRequestsPanel(
    requests: List<MobileTakeoverRequest>,
    activeTakeoverRequestAction: String?,
    onApproveRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit
) {
    var approveConfirmRequestId by remember { mutableStateOf<String?>(null) }
    var declineConfirmRequestId by remember { mutableStateOf<String?>(null) }

    val approveConfirmRequest = remember(requests, approveConfirmRequestId) {
        requests.firstOrNull { it.id == approveConfirmRequestId }
    }
    val declineConfirmRequest = remember(requests, declineConfirmRequestId) {
        requests.firstOrNull { it.id == declineConfirmRequestId }
    }

    if (approveConfirmRequest != null) {
        val requesterName = firstNameFromDisplayName(approveConfirmRequest.requester.displayName)
            ?: approveConfirmRequest.requester.displayName
        AlertDialog(
            onDismissRequest = { approveConfirmRequestId = null },
            title = { Text(stringResource(R.string.mobile_takeover_request_approve_confirm_title)) },
            text = {
                Text(stringResource(R.string.mobile_takeover_request_approve_confirm_body, requesterName, approveConfirmRequest.choreTitle))
            },
            confirmButton = {
                Button(onClick = {
                    val id = approveConfirmRequest.id
                    approveConfirmRequestId = null
                    onApproveRequest(id)
                }) {
                    Text(stringResource(R.string.mobile_takeover_request_approve_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { approveConfirmRequestId = null }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    if (declineConfirmRequest != null) {
        val requesterName = firstNameFromDisplayName(declineConfirmRequest.requester.displayName)
            ?: declineConfirmRequest.requester.displayName
        AlertDialog(
            onDismissRequest = { declineConfirmRequestId = null },
            title = { Text(stringResource(R.string.mobile_takeover_request_decline_confirm_title)) },
            text = {
                Text(stringResource(R.string.mobile_takeover_request_decline_confirm_body, requesterName, declineConfirmRequest.choreTitle))
            },
            confirmButton = {
                Button(onClick = {
                    val id = declineConfirmRequest.id
                    declineConfirmRequestId = null
                    onDeclineRequest(id)
                }) {
                    Text(stringResource(R.string.mobile_takeover_request_decline_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { declineConfirmRequestId = null }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    ChoreSectionPanel(
        title = stringResource(R.string.mobile_takeover_requests_title),
        count = requests.size,
        tone = MobileChoreSectionTone.OTHERS
    ) {
        for (request in requests) {
            Card(shape = RoundedCornerShape(20.dp)) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = request.choreTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(
                            R.string.mobile_takeover_request_card_body,
                            firstNameFromDisplayName(request.requester.displayName) ?: request.requester.displayName
                        ),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = stringResource(R.string.mobile_requested_at, formatApiTimestamp(request.createdAt)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = { approveConfirmRequestId = request.id },
                            enabled = activeTakeoverRequestAction == null,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                stringResource(
                                    if (activeTakeoverRequestAction == "approve:${request.id}") {
                                        R.string.mobile_takeover_request_approving
                                    } else {
                                        R.string.mobile_takeover_request_approve
                                    }
                                )
                            )
                        }
                        OutlinedButton(
                            onClick = { declineConfirmRequestId = request.id },
                            enabled = activeTakeoverRequestAction == null,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                stringResource(
                                    if (activeTakeoverRequestAction == "decline:${request.id}") {
                                        R.string.mobile_takeover_request_declining
                                    } else {
                                        R.string.mobile_takeover_request_decline
                                    }
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoricChoreCard(
    chore: MobileChore,
    expanded: Boolean,
    onExpandedChange: () -> Unit
) {
    val statusLabel = chore.state.replace('_', ' ')
    val hasHistoricDetails = chore.checklist.isNotEmpty() || chore.requirePhotoProof
    val typeTitle = chore.typeTitle.ifBlank { chore.title }
    val subtypeLabel = normalizeSubtypeLabel(chore.subtypeLabel)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Icon(
                        imageVector = Icons.Rounded.AssignmentTurnedIn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(6.dp).size(14.dp)
                    )
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = typeTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    CompactChoreMeta(
                        dueAt = chore.completedAt ?: chore.dueAt,
                        subtypeLabel = subtypeLabel,
                        assignmentLabel = stringResource(R.string.mobile_chores_history),
                        requirePhotoProof = chore.requirePhotoProof,
                        includeWeekdayInDueDate = false,
                        dueLabelResId = R.string.mobile_completed_at
                    )
                }
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = statusLabel,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (hasHistoricDetails) {
                OutlinedButton(
                    onClick = onExpandedChange,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(stringResource(if (expanded) R.string.mobile_chore_close_history else R.string.mobile_chore_open_history))
                }
            }

            if (expanded && hasHistoricDetails) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (chore.checklist.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                chore.checklist.forEach { item ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Checkbox(
                                            checked = chore.completedChecklistIds.contains(item.id),
                                            onCheckedChange = null
                                        )
                                        Text(
                                            text = item.title,
                                            style = MaterialTheme.typography.bodySmall
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

@Composable
private fun ChoreCard(
    chore: MobileChore, currentUserId: String?, currentUserRole: String?, supportsTakeoverRequests: Boolean, expanded: Boolean, activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?, activeCloseCycleAction: String?, activeTakeoverRequestAction: String?,
    outgoingTakeoverRequest: MobileTakeoverRequest?,
    selectedChecklistIds: Set<String>, selectedProofCount: Int, onExpandedChange: () -> Unit, onApprove: (String) -> Unit, onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onTakeProofPhoto: (String) -> Unit, onStartChore: (String) -> Unit, onCloseChoreCycle: (String) -> Unit, onTakeOverChore: (String) -> Unit, onRequestTakeover: (String) -> Unit, onSubmitChore: (String) -> Unit
) {
    var showApproveConfirm by remember { mutableStateOf(false) }
    var showRejectConfirm by remember { mutableStateOf(false) }
    var showCloseCycleConfirm by remember { mutableStateOf(false) }

    if (showApproveConfirm) {
        AlertDialog(
            onDismissRequest = { showApproveConfirm = false },
            title = { Text(stringResource(R.string.mobile_approve_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_approve_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = { showApproveConfirm = false; onApprove(chore.id) }) {
                    Text(stringResource(R.string.mobile_approve_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showApproveConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    if (showRejectConfirm) {
        AlertDialog(
            onDismissRequest = { showRejectConfirm = false },
            title = { Text(stringResource(R.string.mobile_reject_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_reject_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = { showRejectConfirm = false; onReject(chore.id) }) {
                    Text(stringResource(R.string.mobile_reject_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showRejectConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    if (showCloseCycleConfirm) {
        AlertDialog(
            onDismissRequest = { showCloseCycleConfirm = false },
            title = { Text(stringResource(R.string.mobile_close_cycle_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_close_cycle_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = {
                    showCloseCycleConfirm = false
                    onCloseChoreCycle(chore.id)
                }) {
                    Text(stringResource(R.string.mobile_close_cycle_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCloseCycleConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    val isPendingApproval = chore.state == "pending_approval"
    val isSubmittableState = chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
    val canManageTask = chore.assigneeId == null || chore.assigneeId == currentUserId
    val canCloseCycle = currentUserRole != "child" && chore.cycleId != null
    val section = resolveChoreSection(chore, currentUserId)
    val typeTitle = chore.typeTitle.ifBlank { chore.title }
    val subtypeLabel = normalizeSubtypeLabel(chore.subtypeLabel)
    val assignmentLabel = describeChoreAssignment(chore, currentUserId)
    val requiresTakeOver = supportsTakeoverRequests && section == MobileChoreSection.OTHERS && chore.assigneeId != null && chore.assigneeId != currentUserId
    val hasPendingOutgoingTakeover = outgoingTakeoverRequest?.status == "PENDING"
    val canRequestTakeover = supportsTakeoverRequests && currentUserRole != "child" && chore.assigneeId == currentUserId && !hasPendingOutgoingTakeover
    val outgoingTakeoverFirstName = outgoingTakeoverRequest?.requested?.displayName?.let(::firstNameFromDisplayName)
    val statusLabel = if (chore.isOverdue) stringResource(R.string.mobile_state_overdue) else chore.state.replace('_', ' ')
    val accentContainerColor = when (section) {
        MobileChoreSection.MINE -> MaterialTheme.colorScheme.primaryContainer
        MobileChoreSection.UNASSIGNED -> MaterialTheme.colorScheme.tertiaryContainer
        MobileChoreSection.OTHERS -> MaterialTheme.colorScheme.secondaryContainer
    }
    val accentContentColor = when (section) {
        MobileChoreSection.MINE -> MaterialTheme.colorScheme.onPrimaryContainer
        MobileChoreSection.UNASSIGNED -> MaterialTheme.colorScheme.onTertiaryContainer
        MobileChoreSection.OTHERS -> MaterialTheme.colorScheme.onSecondaryContainer
    }
    val sectionIcon = when (section) {
        MobileChoreSection.MINE -> Icons.Rounded.AssignmentTurnedIn
        MobileChoreSection.UNASSIGNED -> Icons.Rounded.AddCircle
        MobileChoreSection.OTHERS -> Icons.Rounded.NotificationsActive
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    shape = CircleShape,
                    color = accentContainerColor
                ) {
                    Icon(
                        imageVector = sectionIcon,
                        contentDescription = null,
                        tint = accentContentColor,
                        modifier = Modifier.padding(6.dp).size(14.dp)
                    )
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = typeTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    CompactChoreMeta(
                        dueAt = chore.dueAt,
                        assignmentLabel = assignmentLabel,
                        subtypeLabel = subtypeLabel,
                        requirePhotoProof = chore.requirePhotoProof
                    )
                }
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (chore.isOverdue) {
                        MaterialTheme.colorScheme.errorContainer
                    } else {
                        accentContainerColor.copy(alpha = 0.8f)
                    }
                ) {
                    Text(
                        text = statusLabel,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (chore.isOverdue) {
                            MaterialTheme.colorScheme.onErrorContainer
                        } else {
                            accentContentColor
                        }
                    )
                }
            }

            if (hasPendingOutgoingTakeover && outgoingTakeoverFirstName != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.72f)
                ) {
                    Text(
                        text = stringResource(
                            R.string.mobile_takeover_pending_with_name,
                            outgoingTakeoverFirstName
                        ),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            if (isPendingApproval) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { showApproveConfirm = true },
                        enabled = activeReviewAction == null,
                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(stringResource(if (activeReviewAction == "approve:${chore.id}") R.string.mobile_approving else R.string.mobile_approve))
                    }
                    OutlinedButton(
                        onClick = { showRejectConfirm = true },
                        enabled = activeReviewAction == null,
                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(stringResource(if (activeReviewAction == "reject:${chore.id}") R.string.mobile_rejecting else R.string.mobile_reject))
                    }
                }
                return@Column
            }

            if (isSubmittableState) {
                Button(
                    onClick = {
                        if (requiresTakeOver) {
                            onTakeOverChore(chore.id)
                        } else {
                            onExpandedChange()
                        }
                    },
                    enabled = if (requiresTakeOver) activeStartAction == null else true,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 38.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        stringResource(
                            if (requiresTakeOver) {
                                if (activeStartAction == "takeover:${chore.id}") {
                                    R.string.mobile_taking_over_task
                                } else {
                                    R.string.mobile_take_over_task
                                }
                            } else if (!canManageTask) {
                                R.string.mobile_view_task
                            } else if (expanded) {
                                R.string.mobile_hide_task_tools
                            } else {
                                R.string.mobile_work_task
                            }
                        )
                    )
                }
            }

            if (requiresTakeOver && canCloseCycle) {
                OutlinedButton(
                    onClick = { showCloseCycleConfirm = true },
                    enabled = activeCloseCycleAction == null,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        stringResource(
                            if (activeCloseCycleAction == "close-cycle:${chore.id}") {
                                R.string.mobile_closing_cycle
                            } else {
                                R.string.mobile_close_cycle
                            }
                        )
                    )
                }
            }

            if (expanded && !requiresTakeOver) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = accentContainerColor.copy(alpha = 0.32f)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (!canManageTask) {
                            Text(
                                text = stringResource(R.string.mobile_chore_read_only_hint),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (chore.checklist.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                chore.checklist.forEach { item ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Checkbox(
                                            checked = selectedChecklistIds.contains(item.id),
                                            onCheckedChange = { onToggleChecklistItem(chore.id, item.id, chore.completedChecklistIds) },
                                            enabled = canManageTask && isSubmittableState
                                        )
                                        Text(
                                            text = item.title,
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                    }
                                }
                            }
                        }
                        if (chore.requirePhotoProof) {
                            if (selectedProofCount > 0) {
                                Text(
                                    text = stringResource(R.string.mobile_selected_photos, selectedProofCount),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            } else {
                                Text(
                                    text = stringResource(R.string.mobile_photo_required_hint),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        if (canManageTask && isSubmittableState) {
                            if (chore.requirePhotoProof) {
                                Text(
                                    text = stringResource(R.string.mobile_photo_step_start),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                                        onClick = { onStartChore(chore.id) },
                                        enabled = activeStartAction == null && chore.state != "in_progress",
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(if (activeStartAction == "start:${chore.id}") R.string.mobile_starting else if (chore.state == "in_progress") R.string.mobile_started else R.string.mobile_start))
                                    }
                                    OutlinedButton(
                                        onClick = { onPickProofs(chore.id) },
                                        enabled = activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(R.string.mobile_pick_photos))
                                    }
                                }
                                Text(
                                    text = stringResource(R.string.mobile_photo_step_proof),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = { onTakeProofPhoto(chore.id) },
                                        enabled = activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(R.string.mobile_take_photo))
                                    }
                                    Button(
                                        onClick = { onSubmitChore(chore.id) },
                                        enabled = activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(if (activeSubmitAction == "submit:${chore.id}") R.string.mobile_submitting else R.string.mobile_submit))
                                    }
                                }
                            } else {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = { onStartChore(chore.id) },
                                        enabled = activeStartAction == null && chore.state != "in_progress",
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(if (activeStartAction == "start:${chore.id}") R.string.mobile_starting else if (chore.state == "in_progress") R.string.mobile_started else R.string.mobile_start))
                                    }
                                    Button(
                                        onClick = { onSubmitChore(chore.id) },
                                        enabled = activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(if (activeSubmitAction == "submit:${chore.id}") R.string.mobile_submitting else R.string.mobile_submit))
                                    }
                                }
                            }
                            if (hasPendingOutgoingTakeover && outgoingTakeoverFirstName != null) {
                                OutlinedButton(
                                    onClick = {},
                                    enabled = false,
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        stringResource(
                                            R.string.mobile_takeover_pending_short_with_name,
                                            outgoingTakeoverFirstName
                                        )
                                    )
                                }
                            } else if (canRequestTakeover) {
                                OutlinedButton(
                                    onClick = { onRequestTakeover(chore.id) },
                                    enabled = activeTakeoverRequestAction == null,
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        stringResource(
                                            if (activeTakeoverRequestAction?.startsWith("request:${chore.id}:") == true) {
                                                R.string.mobile_request_takeover_sending
                                            } else {
                                                R.string.mobile_request_takeover
                                            }
                                        )
                                    )
                                }
                            }
                        }
                    }

                    if (canCloseCycle) {
                        OutlinedButton(
                            onClick = { showCloseCycleConfirm = true },
                            enabled = activeCloseCycleAction == null,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                stringResource(
                                    if (activeCloseCycleAction == "close-cycle:${chore.id}") {
                                        R.string.mobile_closing_cycle
                                    } else {
                                        R.string.mobile_close_cycle
                                    }
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MobileChoiceRow(options: List<MobileChoiceOption>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.chunked(2).forEach { rowOptions ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowOptions.forEach { option ->
                    if (option.selected) {
                        Button(
                            modifier = Modifier.weight(1f),
                            onClick = option.onClick,
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = option.label,
                                textAlign = TextAlign.Center,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    } else {
                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            onClick = option.onClick,
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = option.label,
                                textAlign = TextAlign.Center,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                repeat(2 - rowOptions.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SettingsSectionCard(modifier: Modifier = Modifier, icon: ImageVector, title: String, content: @Composable () -> Unit) {
    Card(modifier = modifier, shape = RoundedCornerShape(24.dp)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = icon, contentDescription = null)
                Text(text = title, style = MaterialTheme.typography.titleMedium)
            }
            content()
        }
    }
}

@Composable
private fun SettingsValueLine(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(text = label, style = MaterialTheme.typography.bodySmall)
        Text(text = value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun CreatePanelCard(modifier: Modifier = Modifier, title: String, content: @Composable () -> Unit) {
    Card(modifier = modifier, shape = RoundedCornerShape(24.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            content()
        }
    }
}

@Composable
private fun CreateTemplateAndSchedulePanel(
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    templateDropdownExpanded: Boolean,
    onTemplateDropdownExpandedChange: (Boolean) -> Unit,
    onTemplateSelected: (String) -> Unit,
    templates: List<com.taskbandit.app.mobile.MobileChoreTemplate>,
    createDueAtMillis: Long,
    onPickDate: () -> Unit,
    onPickTime: () -> Unit
) {
    CreatePanelCard(title = stringResource(R.string.mobile_create_title)) {
        Text(text = stringResource(R.string.mobile_create_template), style = MaterialTheme.typography.titleSmall)
        ExposedDropdownMenuBox(
            expanded = templateDropdownExpanded,
            onExpandedChange = onTemplateDropdownExpandedChange
        ) {
            OutlinedTextField(
                value = selectedTemplate?.title ?: stringResource(R.string.mobile_create_select_template_prompt),
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = templateDropdownExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
            )
            ExposedDropdownMenu(
                expanded = templateDropdownExpanded,
                onDismissRequest = { onTemplateDropdownExpandedChange(false) }
            ) {
                templates.forEach { template ->
                    DropdownMenuItem(
                        text = { Text(template.title) },
                        onClick = { onTemplateSelected(template.id) }
                    )
                }
            }
        }

        Text(text = stringResource(R.string.mobile_create_when), style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = onPickDate, modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.mobile_create_pick_date))
            }
            OutlinedButton(onClick = onPickTime, modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.mobile_create_pick_time))
            }
        }
        Text(
            text = formatEpochMillisForDisplay(createDueAtMillis),
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun CreateRecurrencePanel(
    createRecurrenceType: String,
    createRecurrenceIntervalInput: String,
    createRecurrenceIntervalError: String?,
    recurrenceTypeDropdownExpanded: Boolean,
    onRecurrenceDropdownExpandedChange: (Boolean) -> Unit,
    onRecurrenceTypeSelected: (String) -> Unit,
    onRecurrenceIntervalChange: (String) -> Unit
) {
    val recurrenceLabel = recurrenceTypeLabel(createRecurrenceType)
    CreatePanelCard(title = stringResource(R.string.mobile_create_repeat)) {
        ExposedDropdownMenuBox(
            expanded = recurrenceTypeDropdownExpanded,
            onExpandedChange = onRecurrenceDropdownExpandedChange
        ) {
            OutlinedTextField(
                value = recurrenceLabel,
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = recurrenceTypeDropdownExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
            )
            ExposedDropdownMenu(
                expanded = recurrenceTypeDropdownExpanded,
                onDismissRequest = { onRecurrenceDropdownExpandedChange(false) }
            ) {
                listOf("none", "daily", "weekly", "every_x_days", "monthly", "template").forEach { type ->
                    DropdownMenuItem(
                        text = { Text(recurrenceTypeLabel(type)) },
                        onClick = { onRecurrenceTypeSelected(type) }
                    )
                }
            }
        }
        if (createRecurrenceType == "every_x_days") {
            OutlinedTextField(
                value = createRecurrenceIntervalInput,
                onValueChange = onRecurrenceIntervalChange,
                label = { Text(stringResource(R.string.mobile_create_interval_days_label)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                isError = createRecurrenceIntervalError != null,
                modifier = Modifier.fillMaxWidth()
            )
            if (!createRecurrenceIntervalError.isNullOrBlank()) {
                Text(
                    text = createRecurrenceIntervalError,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun CreateRecurrenceEndPanel(
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    createRecurrenceType: String,
    createRecurrenceEndMode: String,
    createRecurrenceOccurrencesInput: String,
    createRecurrenceOccurrencesError: String?,
    createRecurrenceEndsAtMillis: Long,
    createRecurrenceEndDateError: String?,
    onRecurrenceEndModeSelected: (String) -> Unit,
    onRecurrenceOccurrencesChange: (String) -> Unit,
    onPickEndDate: () -> Unit,
    onPickEndTime: () -> Unit
) {
    val effectiveRecurrenceType = resolveEffectiveCreateRecurrenceType(selectedTemplate, createRecurrenceType)
    if (effectiveRecurrenceType == "none") {
        return
    }

    CreatePanelCard(title = stringResource(R.string.mobile_create_repeat_duration)) {
        MobileChoiceRow(options = listOf(
            MobileChoiceOption(
                label = stringResource(R.string.mobile_create_repeat_forever),
                selected = createRecurrenceEndMode == "never",
                onClick = { onRecurrenceEndModeSelected("never") }
            ),
            MobileChoiceOption(
                label = stringResource(R.string.mobile_create_repeat_after_occurrences),
                selected = createRecurrenceEndMode == "after_occurrences",
                onClick = { onRecurrenceEndModeSelected("after_occurrences") }
            ),
            MobileChoiceOption(
                label = stringResource(R.string.mobile_create_repeat_until_date),
                selected = createRecurrenceEndMode == "on_date",
                onClick = { onRecurrenceEndModeSelected("on_date") }
            )
        ))

        if (createRecurrenceEndMode == "after_occurrences") {
            OutlinedTextField(
                value = createRecurrenceOccurrencesInput,
                onValueChange = onRecurrenceOccurrencesChange,
                label = { Text(stringResource(R.string.mobile_create_repeat_occurrence_count)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                isError = createRecurrenceOccurrencesError != null,
                modifier = Modifier.fillMaxWidth()
            )
            if (!createRecurrenceOccurrencesError.isNullOrBlank()) {
                Text(
                    text = createRecurrenceOccurrencesError,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        if (createRecurrenceEndMode == "on_date") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(onClick = onPickEndDate, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.mobile_create_end_date_pick))
                }
                OutlinedButton(onClick = onPickEndTime, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.mobile_create_end_time_pick))
                }
            }
            Text(
                text = formatEpochMillisForDisplay(createRecurrenceEndsAtMillis),
                style = MaterialTheme.typography.bodyMedium
            )
            if (!createRecurrenceEndDateError.isNullOrBlank()) {
                Text(
                    text = createRecurrenceEndDateError,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun CreateAssignmentPanel(
    createAssignmentStrategy: String,
    assignmentStrategyDropdownExpanded: Boolean,
    onAssignmentDropdownExpandedChange: (Boolean) -> Unit,
    onAssignmentStrategySelected: (String) -> Unit,
    createAssigneeId: String?,
    assigneeDropdownExpanded: Boolean,
    onAssigneeDropdownExpandedChange: (Boolean) -> Unit,
    onAssigneeSelected: (String?) -> Unit,
    members: List<com.taskbandit.app.mobile.MobileHouseholdMember>
) {
    val strategyLabel = assignmentStrategyLabel(createAssignmentStrategy)
    CreatePanelCard(title = stringResource(R.string.mobile_create_assignment)) {
        ExposedDropdownMenuBox(
            expanded = assignmentStrategyDropdownExpanded,
            onExpandedChange = onAssignmentDropdownExpandedChange
        ) {
            OutlinedTextField(
                value = strategyLabel,
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = assignmentStrategyDropdownExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
            )
            ExposedDropdownMenu(
                expanded = assignmentStrategyDropdownExpanded,
                onDismissRequest = { onAssignmentDropdownExpandedChange(false) }
            ) {
                listOf("round_robin", "least_completed_recently", "highest_streak", "manual_default_assignee").forEach { strategy ->
                    DropdownMenuItem(
                        text = { Text(assignmentStrategyLabel(strategy)) },
                        onClick = { onAssignmentStrategySelected(strategy) }
                    )
                }
            }
        }

        if (createAssignmentStrategy == "manual_default_assignee") {
            Text(text = stringResource(R.string.mobile_create_assignee), style = MaterialTheme.typography.titleSmall)
            val unassignedLabel = stringResource(R.string.mobile_create_unassigned)
            val selectedMemberName = members.firstOrNull { it.id == createAssigneeId }?.displayName ?: unassignedLabel
            ExposedDropdownMenuBox(
                expanded = assigneeDropdownExpanded,
                onExpandedChange = onAssigneeDropdownExpandedChange
            ) {
                OutlinedTextField(
                    value = selectedMemberName,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = assigneeDropdownExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = assigneeDropdownExpanded,
                    onDismissRequest = { onAssigneeDropdownExpandedChange(false) }
                ) {
                    DropdownMenuItem(
                        text = { Text(unassignedLabel) },
                        onClick = { onAssigneeSelected(null) }
                    )
                    members.forEach { member ->
                        DropdownMenuItem(
                            text = { Text(member.displayName) },
                            onClick = { onAssigneeSelected(member.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CreateVariantPanel(
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    createVariantId: String?,
    variantDropdownExpanded: Boolean,
    onVariantDropdownExpandedChange: (Boolean) -> Unit,
    onVariantSelected: (String?) -> Unit
) {
    selectedTemplate?.takeIf { it.variants.isNotEmpty() }?.let { template ->
        val selectedVariantLabel =
            template.variants.firstOrNull { it.id == createVariantId }?.label
                ?: stringResource(R.string.mobile_create_select_variant_prompt)

        CreatePanelCard(title = stringResource(R.string.mobile_create_variant)) {
            ExposedDropdownMenuBox(
                expanded = variantDropdownExpanded,
                onExpandedChange = onVariantDropdownExpandedChange
            ) {
                OutlinedTextField(
                    value = selectedVariantLabel,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = variantDropdownExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = variantDropdownExpanded,
                    onDismissRequest = { onVariantDropdownExpandedChange(false) }
                ) {
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.mobile_create_no_subtype)) },
                        onClick = { onVariantSelected(null) }
                    )
                    template.variants.forEach { variant ->
                        DropdownMenuItem(
                            text = { Text(variant.label) },
                            onClick = { onVariantSelected(variant.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CreateSubmitPanel(
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    createDueAtMillis: Long,
    createAssigneeId: String?,
    createAssignmentStrategy: String,
    createRecurrenceType: String,
    createRecurrenceInterval: Int?,
    createRecurrenceIntervalError: String?,
    createRecurrenceEndMode: String,
    createRecurrenceOccurrences: Int?,
    createRecurrenceOccurrencesError: String?,
    createRecurrenceEndsAtMillis: Long,
    createRecurrenceEndDateError: String?,
    createVariantId: String?,
    activeCreateAction: String?,
    onCreateChore: (String, String, String?, String, String?, Int?, String?, Int?, String?, String?) -> Unit
) {
    CreatePanelCard(title = stringResource(R.string.mobile_create_action)) {
        selectedTemplate?.let { template ->
            val effectiveRecurrenceType = resolveEffectiveCreateRecurrenceType(template, createRecurrenceType)
            val needsRecurrenceInterval = createRecurrenceType == "every_x_days"
            val needsRecurrenceOccurrences =
                effectiveRecurrenceType != "none" && createRecurrenceEndMode == "after_occurrences"
            val needsRecurrenceEndDate =
                effectiveRecurrenceType != "none" && createRecurrenceEndMode == "on_date"
            val canCreate =
                activeCreateAction == null &&
                    (!needsRecurrenceInterval || (createRecurrenceIntervalError == null && (createRecurrenceInterval ?: 0) > 0)) &&
                    (!needsRecurrenceOccurrences || (createRecurrenceOccurrencesError == null && (createRecurrenceOccurrences ?: 0) > 0)) &&
                    (!needsRecurrenceEndDate || createRecurrenceEndDateError == null)
            Button(
                onClick = {
                    val recType = if (createRecurrenceType == "template") null else createRecurrenceType
                    val recInterval = if (createRecurrenceType == "every_x_days") createRecurrenceInterval else null
                    val recurrenceEndMode = if (effectiveRecurrenceType == "none") null else createRecurrenceEndMode
                    val recurrenceOccurrences =
                        if (createRecurrenceEndMode == "after_occurrences") createRecurrenceOccurrences else null
                    val recurrenceEndsAtIsoUtc =
                        if (createRecurrenceEndMode == "on_date") Instant.ofEpochMilli(createRecurrenceEndsAtMillis).toString() else null
                    onCreateChore(
                        template.id,
                        Instant.ofEpochMilli(createDueAtMillis).toString(),
                        createAssigneeId,
                        createAssignmentStrategy,
                        recType,
                        recInterval,
                        recurrenceEndMode,
                        recurrenceOccurrences,
                        recurrenceEndsAtIsoUtc,
                        createVariantId
                    )
                },
                enabled = canCreate,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (activeCreateAction != null) {
                    Text(stringResource(R.string.mobile_create_creating))
                } else {
                    Text(stringResource(R.string.mobile_create_action))
                }
            }
        }
    }
}

@Composable
private fun SettingsAppearanceContent(
    themeMode: MobileThemeMode,
    onThemeModeChange: (MobileThemeMode) -> Unit,
    languageTag: String,
    onLanguageTagChange: (String) -> Unit
) {
    Text(text = stringResource(R.string.mobile_settings_theme), style = MaterialTheme.typography.titleMedium)
    MobileChoiceRow(options = listOf(
        MobileChoiceOption(label = stringResource(R.string.mobile_theme_system), selected = themeMode == MobileThemeMode.SYSTEM, onClick = { onThemeModeChange(MobileThemeMode.SYSTEM) }),
        MobileChoiceOption(label = stringResource(R.string.mobile_theme_light), selected = themeMode == MobileThemeMode.LIGHT, onClick = { onThemeModeChange(MobileThemeMode.LIGHT) }),
        MobileChoiceOption(label = stringResource(R.string.mobile_theme_dark), selected = themeMode == MobileThemeMode.DARK, onClick = { onThemeModeChange(MobileThemeMode.DARK) })
    ))
    Text(text = stringResource(R.string.mobile_settings_language), style = MaterialTheme.typography.titleMedium)
    MobileChoiceRow(options = listOf(
        MobileChoiceOption(label = stringResource(R.string.mobile_language_system), selected = languageTag == "system", onClick = { onLanguageTagChange("system") }),
        MobileChoiceOption(label = stringResource(R.string.mobile_language_en), selected = languageTag == "en", onClick = { onLanguageTagChange("en") }),
        MobileChoiceOption(label = stringResource(R.string.mobile_language_de), selected = languageTag == "de", onClick = { onLanguageTagChange("de") }),
        MobileChoiceOption(label = stringResource(R.string.mobile_language_hu), selected = languageTag == "hu", onClick = { onLanguageTagChange("hu") })
    ))
}

@Composable
private fun SettingsDeviceContent(
    currentDevice: MobileNotificationDevice?,
    installationId: String,
    notificationsPermissionGranted: Boolean,
    isBusy: Boolean,
    activeDeviceAction: String?,
    onRefresh: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    onRemoveNotificationDevice: (String) -> Unit
) {
    Text(text = if (currentDevice == null) stringResource(R.string.mobile_device_status_missing) else stringResource(R.string.mobile_device_status_ready), style = MaterialTheme.typography.bodyMedium)
    SettingsValueLine(label = stringResource(R.string.mobile_settings_notifications_permission), value = stringResource(if (notificationsPermissionGranted) R.string.mobile_settings_notifications_allowed else R.string.mobile_settings_notifications_needed))
    SettingsValueLine(label = stringResource(R.string.mobile_settings_installation_id), value = installationId)
    currentDevice?.let { device ->
        SettingsValueLine(label = stringResource(R.string.mobile_settings_provider), value = device.provider)
        SettingsValueLine(label = stringResource(R.string.mobile_settings_device_name), value = device.deviceName ?: stringResource(R.string.mobile_settings_unknown))
        SettingsValueLine(label = stringResource(R.string.mobile_settings_last_seen), value = formatApiTimestamp(device.lastSeenAt))
        device.appVersion?.let { version -> SettingsValueLine(label = stringResource(R.string.mobile_settings_app_version), value = version) }
        device.locale?.let { locale -> SettingsValueLine(label = stringResource(R.string.mobile_settings_locale), value = locale) }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(onClick = onRefresh, enabled = !isBusy) { Text(stringResource(R.string.mobile_device_refresh)) }
        if (!notificationsPermissionGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            OutlinedButton(onClick = onRequestNotificationPermission) {
                Icon(imageVector = Icons.Rounded.NotificationsActive, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.size(6.dp))
                Text(stringResource(R.string.mobile_device_allow_notifications))
            }
        }
    }
    if (currentDevice != null) {
        OutlinedButton(onClick = { onRemoveNotificationDevice(currentDevice.id) }, enabled = activeDeviceAction == null) {
            Text(stringResource(if (activeDeviceAction == "remove:${currentDevice.id}") R.string.mobile_device_removing else R.string.mobile_device_remove))
        }
    }
}

@Composable
private fun SettingsReleaseContent(
    currentReleaseLabel: String,
    serverReleaseLabel: String?,
    serverUrl: String,
    availableUpdate: MobileReleaseInfo?,
    onDismissUpdate: () -> Unit
) {
    SettingsValueLine(label = stringResource(R.string.mobile_settings_app_release), value = currentReleaseLabel)
    SettingsValueLine(label = stringResource(R.string.mobile_settings_server_release), value = serverReleaseLabel ?: stringResource(R.string.mobile_settings_unknown))
    SettingsValueLine(label = stringResource(R.string.mobile_settings_server_url), value = serverUrl)
    SettingsValueLine(label = stringResource(R.string.mobile_settings_commit), value = BuildConfig.TASKBANDIT_COMMIT_SHA)
    if (availableUpdate != null) {
        Card {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = stringResource(R.string.mobile_update_available_title), style = MaterialTheme.typography.titleMedium)
                Text(text = stringResource(R.string.mobile_update_available_body, currentReleaseLabel, formatReleaseLabel(availableUpdate)), style = MaterialTheme.typography.bodySmall)
                Button(onClick = onDismissUpdate) { Text(stringResource(R.string.mobile_update_dismiss)) }
            }
        }
    }
}

@Composable
private fun SettingsActionsContent(
    isBusy: Boolean,
    onRefresh: () -> Unit,
    onLogout: () -> Unit
) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(onClick = onRefresh, enabled = !isBusy) { Text(stringResource(R.string.mobile_refresh)) }
        OutlinedButton(onClick = onLogout) { Text(stringResource(R.string.mobile_logout)) }
    }
}

private fun resolveChoreSection(chore: MobileChore, currentUserId: String?): MobileChoreSection = when {
    chore.assigneeId != null && chore.assigneeId == currentUserId -> MobileChoreSection.MINE
    chore.assigneeId.isNullOrBlank() -> MobileChoreSection.UNASSIGNED
    else -> MobileChoreSection.OTHERS
}

private enum class MobileMyChoreDueBucket {
    TODAY,
    THIS_WEEK,
    LATER
}

private fun resolveMyChoreDueBucket(
    chore: MobileChore,
    zoneId: ZoneId = ZoneId.systemDefault(),
    locale: Locale = Locale.getDefault()
): MobileMyChoreDueBucket {
    val today = LocalDate.now(zoneId)
    val dueDate = runCatching { Instant.parse(chore.dueAt).atZone(zoneId).toLocalDate() }.getOrDefault(today)

    if (!dueDate.isAfter(today)) {
        return MobileMyChoreDueBucket.TODAY
    }

    val weekFields = WeekFields.of(locale)
    val startOfWeek = today.with(weekFields.dayOfWeek(), 1)
    val endOfWeek = startOfWeek.plusDays(6)

    return if (!dueDate.isAfter(endOfWeek)) {
        MobileMyChoreDueBucket.THIS_WEEK
    } else {
        MobileMyChoreDueBucket.LATER
    }
}

private fun choreSectionRank(section: MobileChoreSection): Int = when (section) {
    MobileChoreSection.MINE -> 0
    MobileChoreSection.UNASSIGNED -> 1
    MobileChoreSection.OTHERS -> 2
}

private fun parseInstantForSort(value: String): Instant = runCatching { Instant.parse(value) }.getOrDefault(Instant.MAX)

@Composable
private fun describeChoreAssignment(chore: MobileChore, currentUserId: String?): String = when (resolveChoreSection(chore, currentUserId)) {
    MobileChoreSection.MINE -> stringResource(R.string.mobile_chore_assigned_to_you)
    MobileChoreSection.UNASSIGNED -> stringResource(R.string.mobile_chore_unassigned)
    MobileChoreSection.OTHERS -> {
        val firstName = firstNameFromDisplayName(chore.assigneeDisplayName)
        if (firstName != null) {
            stringResource(R.string.mobile_chore_assigned_to_name, firstName)
        } else {
            stringResource(R.string.mobile_chore_assigned_elsewhere)
        }
    }
}

private fun firstNameFromDisplayName(displayName: String?): String? =
    displayName
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?.split(Regex("\\s+"))
        ?.firstOrNull()

private fun normalizeSubtypeLabel(value: String?): String? =
    value
        ?.trim()
        ?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }

private fun defaultCreateDueAtMillis(): Long =
    Instant.now()
        .plus(4, ChronoUnit.HOURS)
        .truncatedTo(ChronoUnit.MINUTES)
        .toEpochMilli()

private fun defaultCreateRecurrenceEndsAtMillis(baseDueAtMillis: Long = defaultCreateDueAtMillis()): Long =
    Instant.ofEpochMilli(baseDueAtMillis)
        .atZone(ZoneId.systemDefault())
        .plusWeeks(4)
        .toInstant()
        .toEpochMilli()

private fun formatEpochMillisForDisplay(value: Long): String =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(value))

private fun resolveEffectiveCreateRecurrenceType(
    template: MobileChoreTemplate?,
    createRecurrenceType: String
): String {
    return if (createRecurrenceType == "template") {
        template?.recurrence?.type ?: "none"
    } else {
        createRecurrenceType
    }
}

@Composable
private fun assignmentStrategyLabel(value: String): String = when (value) {
    "least_completed_recently" -> stringResource(R.string.mobile_create_assignment_least_completed)
    "highest_streak" -> stringResource(R.string.mobile_create_assignment_highest_streak)
    "manual_default_assignee" -> stringResource(R.string.mobile_create_assignment_manual)
    else -> stringResource(R.string.mobile_create_assignment_round_robin)
}

@Composable
private fun recurrenceTypeLabel(value: String): String = when (value) {
    "none" -> stringResource(R.string.mobile_create_repeat_no)
    "daily" -> stringResource(R.string.mobile_create_repeat_daily_short)
    "weekly" -> stringResource(R.string.mobile_create_repeat_weekly_short)
    "every_x_days" -> stringResource(R.string.mobile_create_repeat_every_x_days_option)
    "monthly" -> stringResource(R.string.mobile_create_repeat_monthly_short)
    else -> stringResource(R.string.mobile_create_repeat_template_short)
}

private fun templateRecurrenceDefaults(recurrence: MobileTemplateRecurrence): Pair<String, Int> = when (recurrence.type) {
    "daily" -> "daily" to 1
    "weekly" -> "weekly" to 7
    "monthly" -> "monthly" to 30
    "every_x_days" -> "every_x_days" to (recurrence.intervalDays ?: 7)
    "custom_weekly" -> "template" to 7
    else -> "none" to 1
}

private fun formatApiTimestamp(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(value)
}

private fun formatDueAtForCard(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("EEEE d MMM HH:mm", Locale.getDefault())
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(formatApiTimestamp(value))
}

private fun formatDueAtForHistoricCard(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("d MMM HH:mm", Locale.getDefault())
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(formatApiTimestamp(value))
}

private suspend fun flushQueuedSubmissions(
    api: TaskBanditMobileApi,
    outboxStore: TaskBanditOutboxStore,
    baseUrl: String,
    token: String,
    contentResolver: ContentResolver,
    onSyncingChange: (Boolean) -> Unit
): Int {
    val drafts = outboxStore.readQueue()
    if (drafts.isEmpty()) {
        return 0
    }

    onSyncingChange(true)
    var flushedCount = 0

    for (draft in drafts) {
        try {
            withContext(Dispatchers.IO) {
                submitDraft(
                    api = api,
                    baseUrl = baseUrl,
                    token = token,
                    draft = draft,
                    contentResolver = contentResolver
                )
                outboxStore.remove(draft.id)
            }
            flushedCount += 1
        } catch (throwable: Throwable) {
            if (throwable is TaskBanditUnauthorizedException) {
                throw throwable
            }
        }
    }

    onSyncingChange(false)
    return flushedCount
}

private fun submitDraft(
    api: TaskBanditMobileApi,
    baseUrl: String,
    token: String,
    draft: MobileChoreSubmissionDraft,
    contentResolver: ContentResolver
) {
    val uploadedProofs = draft.proofUriStrings.map { uriString ->
        val proofInput = readProofInput(contentResolver, uriString)
        api.uploadProof(
            baseUrl = baseUrl,
            token = token,
            filename = proofInput.filename,
            contentType = proofInput.contentType,
            contentBytes = proofInput.bytes
        )
    }

    api.submitChore(
        baseUrl = baseUrl,
        token = token,
        instanceId = draft.choreId,
        completedChecklistItemIds = draft.completedChecklistIds,
        attachments = uploadedProofs,
        note = draft.note
    )
}

private data class ProofInput(
    val filename: String,
    val contentType: String,
    val bytes: ByteArray
)

private fun readProofInput(contentResolver: ContentResolver, uriString: String): ProofInput {
    val uri = Uri.parse(uriString)
    val filename = readUriDisplayName(contentResolver, uri)
    val contentType = contentResolver.getType(uri) ?: "image/jpeg"
    val bytes = contentResolver.openInputStream(uri)?.use { stream ->
        stream.readBytes()
    } ?: throw IllegalStateException("Could not read the selected proof image.")

    return ProofInput(
        filename = filename,
        contentType = contentType,
        bytes = bytes
    )
}

private fun readUriDisplayName(contentResolver: ContentResolver, uri: Uri): String {
    contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val columnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (columnIndex >= 0 && cursor.moveToFirst()) {
            return cursor.getString(columnIndex).orEmpty().ifBlank { "proof-image" }
        }
    }

    return "proof-image"
}

private fun createProofCaptureFile(context: android.content.Context): File {
    val proofDirectory = File(context.filesDir, "proof-captures").apply { mkdirs() }
    return File(proofDirectory, "proof-${UUID.randomUUID()}.jpg")
}
