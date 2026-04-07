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
import androidx.core.content.ContextCompat
import androidx.core.os.LocaleListCompat
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.AssignmentTurnedIn
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
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
import androidx.compose.ui.unit.dp
import com.taskbandit.app.mobile.MobileDashboard
import com.taskbandit.app.mobile.MobileDashboardSyncSignal
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.MobileNotificationDevice
import com.taskbandit.app.mobile.MobileNotificationDeviceRegistration
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import java.util.UUID

private const val defaultApiBaseUrl = "http://10.0.2.2:8080"

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

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sharedPreferences = getSharedPreferences("taskbandit-session", MODE_PRIVATE)
        val sessionStore = TaskBanditSessionStore(sharedPreferences)
        val appPreferencesStore = TaskBanditAppPreferencesStore(sharedPreferences)
        val outboxStore = TaskBanditOutboxStore(sharedPreferences)
        val widgetStore = TaskBanditWidgetStore(sharedPreferences)

        setContent {
            TaskBanditApp(
                api = TaskBanditMobileApi(),
                sessionStore = sessionStore,
                appPreferencesStore = appPreferencesStore,
                outboxStore = outboxStore,
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
    outboxStore: TaskBanditOutboxStore,
    widgetStore: TaskBanditWidgetStore
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val loginFailedMessage = stringResource(R.string.mobile_login_failed)
    val checklistRequiredMessage = stringResource(R.string.mobile_checklist_required)
    val photoRequiredMessage = stringResource(R.string.mobile_photo_required_missing)
    val queuedNoticeMessage = stringResource(R.string.mobile_submission_queued)
    val syncedNoticeTemplate = stringResource(R.string.mobile_queue_synced)
    val submissionSentMessage = stringResource(R.string.mobile_submission_sent)
    val choreStartedMessage = stringResource(R.string.mobile_chore_started)
    val choreCreatedMessage = stringResource(R.string.mobile_chore_created)
    val createChoreFailedMessage = stringResource(R.string.mobile_create_chore_failed)
    val deviceRemovedMessage = stringResource(R.string.mobile_device_removed)
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
    var activeCreateAction by remember { mutableStateOf<String?>(null) }
    var activeDeviceAction by remember { mutableStateOf<String?>(null) }
    var submitSelections by remember { mutableStateOf<Map<String, Set<String>>>(emptyMap()) }
    var selectedProofUris by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var pendingPhotoPickerChoreId by remember { mutableStateOf<String?>(null) }
    var queuedSubmissionCount by remember { mutableIntStateOf(outboxStore.readQueue().size) }
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

            selectedProofUris = selectedProofUris + (choreId to uris.map(Uri::toString))
        }
        pendingPhotoPickerChoreId = null
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
        isBusy = false
        refreshQueued = false
        errorMessage = null
        noticeMessage = null
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
                val flushedCount = flushQueuedSubmissions(
                    api = api,
                    outboxStore = outboxStore,
                    baseUrl = baseUrl,
                    token = token,
                    contentResolver = context.contentResolver,
                    onSyncingChange = { isSyncing -> isSyncingQueue = isSyncing }
                )

                if (flushedCount > 0) {
                    Pair(
                        withContext(Dispatchers.IO) {
                            refreshPayload.copy(dashboard = api.loadDashboard(baseUrl, token))
                        },
                        flushedCount
                    )
                } else {
                    Pair(refreshPayload, 0)
                }
            }.onSuccess { (loadedPayload, flushedCount) ->
                dashboard = loadedPayload.dashboard
                serverReleaseInfo = loadedPayload.latestReleaseInfo
                notificationDevices = loadedPayload.notificationDevices
                serverUrl = baseUrl
                sessionStore.saveSession(baseUrl, token)
                val currentQueuedSubmissionCount = outboxStore.readQueue().size
                queuedSubmissionCount = currentQueuedSubmissionCount
                widgetStore.saveDashboard(loadedPayload.dashboard, currentQueuedSubmissionCount)
                TaskBanditWidgetProvider.refreshAllWidgets(context)
                if (flushedCount > 0) {
                    noticeMessage = syncedNoticeTemplate.format(flushedCount)
                }
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
                    if (approve) {
                        api.approveChore(baseUrl, token, instanceId)
                    } else {
                        api.rejectChore(baseUrl, token, instanceId)
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
                    api.markNotificationRead(baseUrl, token, notificationId)
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

    fun startChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeStartAction = "start:$choreId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    api.startChore(baseUrl, token, choreId)
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

    fun submitChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        val chore = dashboard?.chores?.firstOrNull { it.id == choreId } ?: return

        val selectedChecklistIds = (submitSelections[choreId] ?: chore.completedChecklistIds.toSet()).toList()
        val proofUriStrings = selectedProofUris[choreId].orEmpty()
        val missingRequiredItems = chore.checklist.filter { it.required && !selectedChecklistIds.contains(it.id) }
        if (missingRequiredItems.isNotEmpty()) {
            errorMessage = checklistRequiredMessage
            return
        }

        if (chore.requirePhotoProof && proofUriStrings.isEmpty()) {
            errorMessage = photoRequiredMessage
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
                    submitDraft(
                        api = api,
                        baseUrl = baseUrl,
                        token = token,
                        draft = draft,
                        contentResolver = context.contentResolver
                    )
                }
                selectedProofUris = selectedProofUris - choreId
                submitSelections = submitSelections - choreId
                noticeMessage = submissionSentMessage
                requestDashboardRefresh()
            } catch (throwable: Throwable) {
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else if (throwable is TaskBanditTransportException) {
                    withContext(Dispatchers.IO) {
                        outboxStore.enqueue(draft)
                    }
                    val currentQueuedSubmissionCount = outboxStore.readQueue().size
                    queuedSubmissionCount = currentQueuedSubmissionCount
                    dashboard?.let { loadedDashboard ->
                        widgetStore.saveDashboard(loadedDashboard, currentQueuedSubmissionCount)
                        TaskBanditWidgetProvider.refreshAllWidgets(context)
                    }
                    selectedProofUris = selectedProofUris - choreId
                    submitSelections = submitSelections - choreId
                    noticeMessage = queuedNoticeMessage
                } else {
                    errorMessage = throwable.message
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
                    api.createChoreInstance(
                        baseUrl = baseUrl,
                        token = token,
                        templateId = templateId,
                        dueAtIsoUtc = dueAtIsoUtc,
                        assigneeId = assigneeId,
                        assignmentStrategy = assignmentStrategy,
                        recurrenceType = recurrenceType,
                        recurrenceIntervalDays = recurrenceIntervalDays,
                        suppressRecurrence = recurrenceType == "none",
                        variantId = variantId
                    )
                }
            }.onSuccess {
                noticeMessage = choreCreatedMessage
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

    fun removeNotificationDevice(deviceId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeDeviceAction = "remove:$deviceId"
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    api.deleteNotificationDevice(baseUrl, token, deviceId)
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
                    isSyncingQueue = isSyncingQueue,
                    activeReviewAction = activeReviewAction,
                    activeStartAction = activeStartAction,
                    activeSubmitAction = activeSubmitAction,
                    activeCreateAction = activeCreateAction,
                    activeDeviceAction = activeDeviceAction,
                    errorMessage = errorMessage,
                    noticeMessage = noticeMessage,
                    queuedSubmissionCount = queuedSubmissionCount,
                    onDismissUpdate = ::dismissUpdateNotice,
                    onRefresh = ::requestDashboardRefresh,
                    onLogout = ::logout,
                    onApprove = { instanceId -> reviewPendingChore(instanceId, true) },
                    onReject = { instanceId -> reviewPendingChore(instanceId, false) },
                    onToggleChecklistItem = ::toggleChecklistItem,
                    submitSelections = submitSelections,
                    selectedProofUris = selectedProofUris,
                    onPickProofs = ::openProofPicker,
                    onStartChore = ::startChore,
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
    Box(
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
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
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
    isSyncingQueue: Boolean,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCreateAction: String?,
    activeDeviceAction: String?,
    errorMessage: String?,
    noticeMessage: String?,
    queuedSubmissionCount: Int,
    onDismissUpdate: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onPickProofs: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onSubmitChore: (String) -> Unit,
    onCreateChore: (String, String, String?, String, String?, Int?, String?) -> Unit,
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
    var createRecurrenceInterval by rememberSaveable { mutableIntStateOf(7) }
    var expandedChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var expandedHistoricChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var templateDropdownExpanded by remember { mutableStateOf(false) }
    var recurrenceTypeDropdownExpanded by remember { mutableStateOf(false) }
    var assignmentStrategyDropdownExpanded by remember { mutableStateOf(false) }
    var assigneeDropdownExpanded by remember { mutableStateOf(false) }
    var createVariantId by rememberSaveable { mutableStateOf<String?>(null) }
    var variantDropdownExpanded by remember { mutableStateOf(false) }
    val currentDevice = notificationDevices.firstOrNull { it.installationId == installationId }
    val templates = dashboard?.templates.orEmpty()
    val members = dashboard?.members.orEmpty()
    val selectedTemplate = remember(templates, selectedTemplateId) {
        templates.firstOrNull { it.id == selectedTemplateId } ?: templates.firstOrNull()
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
    val unassignedChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.UNASSIGNED } }
    val otherChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.OTHERS } }
    val choresMineLabel = stringResource(R.string.mobile_chores_mine)
    val choresUnassignedLabel = stringResource(R.string.mobile_chores_unassigned)
    val choresOthersLabel = stringResource(R.string.mobile_chores_others)
    val choresHistoryLabel = stringResource(R.string.mobile_chores_history)
    val showStatusCard = queuedSubmissionCount > 0 || isSyncingQueue || !noticeMessage.isNullOrBlank() || !errorMessage.isNullOrBlank()

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
        createRecurrenceInterval = defaultInterval
        createAssigneeId = null
        createVariantId = null
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

    Scaffold(
        bottomBar = {
            Card(shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MobileTabButton(
                        selected = activeTab == MobileDashboardTab.CHORES,
                        label = stringResource(R.string.mobile_tab_chores),
                        icon = Icons.Rounded.AssignmentTurnedIn,
                        onClick = {
                            activeTab = MobileDashboardTab.CHORES
                            expandedChoreIds = emptySet()
                        }
                    )
                    MobileCenterTabButton(
                        selected = activeTab == MobileDashboardTab.CREATE,
                        label = stringResource(R.string.mobile_tab_create),
                        icon = Icons.Rounded.AddCircle,
                        onClick = {
                            activeTab = MobileDashboardTab.CREATE
                            expandedChoreIds = emptySet()
                        }
                    )
                    MobileTabButton(
                        selected = activeTab == MobileDashboardTab.SETTINGS,
                        label = stringResource(R.string.mobile_tab_settings),
                        icon = Icons.Rounded.Tune,
                        onClick = { activeTab = MobileDashboardTab.SETTINGS }
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.background))).padding(padding).padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (activeTab == MobileDashboardTab.CHORES) {
                if (sortedChores.isEmpty() && historicChores.isEmpty()) {
                    item { Text(text = stringResource(R.string.mobile_no_chores), style = MaterialTheme.typography.bodyMedium) }
                }
                choreSection(chores = myChores, title = choresMineLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onStartChore = onStartChore, onSubmitChore = onSubmitChore)
                choreSection(chores = unassignedChores, title = choresUnassignedLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onStartChore = onStartChore, onSubmitChore = onSubmitChore)
                choreSection(chores = otherChores, title = choresOthersLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onStartChore = onStartChore, onSubmitChore = onSubmitChore)
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
                            isBusy = isBusy,
                            isSyncingQueue = isSyncingQueue,
                            errorMessage = errorMessage,
                            noticeMessage = noticeMessage,
                            queuedSubmissionCount = queuedSubmissionCount,
                            onRefresh = onRefresh
                        )
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
                        Card(shape = RoundedCornerShape(24.dp)) {
                            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text(
                                    text = stringResource(R.string.mobile_create_title),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold
                                )

                                // Template
                                Text(text = stringResource(R.string.mobile_create_template), style = MaterialTheme.typography.titleSmall)
                                ExposedDropdownMenuBox(
                                    expanded = templateDropdownExpanded,
                                    onExpandedChange = { templateDropdownExpanded = it }
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
                                        onDismissRequest = { templateDropdownExpanded = false }
                                    ) {
                                        templates.forEach { template ->
                                            DropdownMenuItem(
                                                text = { Text(template.title) },
                                                onClick = {
                                                    selectedTemplateId = template.id
                                                    templateDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Date and time
                                Text(text = stringResource(R.string.mobile_create_when), style = MaterialTheme.typography.titleSmall)
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Button(onClick = { datePickerDialog.show() }) {
                                        Text(stringResource(R.string.mobile_create_pick_date))
                                    }
                                    OutlinedButton(onClick = { timePickerDialog.show() }) {
                                        Text(stringResource(R.string.mobile_create_pick_time))
                                    }
                                }
                                Text(
                                    text = formatEpochMillisForDisplay(createDueAtMillis),
                                    style = MaterialTheme.typography.bodyMedium
                                )

                                // Recurrence
                                Text(text = stringResource(R.string.mobile_create_repeat), style = MaterialTheme.typography.titleSmall)
                                val recurrenceLabel = recurrenceTypeLabel(createRecurrenceType)
                                ExposedDropdownMenuBox(
                                    expanded = recurrenceTypeDropdownExpanded,
                                    onExpandedChange = { recurrenceTypeDropdownExpanded = it }
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
                                        onDismissRequest = { recurrenceTypeDropdownExpanded = false }
                                    ) {
                                        listOf("none", "daily", "weekly", "every_x_days", "monthly", "template").forEach { type ->
                                            DropdownMenuItem(
                                                text = { Text(recurrenceTypeLabel(type)) },
                                                onClick = {
                                                    createRecurrenceType = type
                                                    recurrenceTypeDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                                if (createRecurrenceType == "every_x_days") {
                                    OutlinedTextField(
                                        value = createRecurrenceInterval.toString(),
                                        onValueChange = { v ->
                                            v.toIntOrNull()?.let { if (it > 0) createRecurrenceInterval = it }
                                        },
                                        label = { Text(stringResource(R.string.mobile_create_interval_days_label)) },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                // Assignment strategy
                                Text(text = stringResource(R.string.mobile_create_assignment), style = MaterialTheme.typography.titleSmall)
                                val strategyLabel = assignmentStrategyLabel(createAssignmentStrategy)
                                ExposedDropdownMenuBox(
                                    expanded = assignmentStrategyDropdownExpanded,
                                    onExpandedChange = { assignmentStrategyDropdownExpanded = it }
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
                                        onDismissRequest = { assignmentStrategyDropdownExpanded = false }
                                    ) {
                                        listOf("round_robin", "least_completed_recently", "highest_streak", "manual_default_assignee").forEach { strategy ->
                                            DropdownMenuItem(
                                                text = { Text(assignmentStrategyLabel(strategy)) },
                                                onClick = {
                                                    createAssignmentStrategy = strategy
                                                    if (strategy != "manual_default_assignee") createAssigneeId = null
                                                    assignmentStrategyDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Manual assignee
                                if (createAssignmentStrategy == "manual_default_assignee") {
                                    Text(text = stringResource(R.string.mobile_create_assignee), style = MaterialTheme.typography.titleSmall)
                                    val unassignedLabel = stringResource(R.string.mobile_create_unassigned)
                                    val selectedMemberName = members.firstOrNull { it.id == createAssigneeId }?.displayName ?: unassignedLabel
                                    ExposedDropdownMenuBox(
                                        expanded = assigneeDropdownExpanded,
                                        onExpandedChange = { assigneeDropdownExpanded = it }
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
                                            onDismissRequest = { assigneeDropdownExpanded = false }
                                        ) {
                                            DropdownMenuItem(
                                                text = { Text(unassignedLabel) },
                                                onClick = { createAssigneeId = null; assigneeDropdownExpanded = false }
                                            )
                                            members.forEach { member ->
                                                DropdownMenuItem(
                                                    text = { Text(member.displayName) },
                                                    onClick = { createAssigneeId = member.id; assigneeDropdownExpanded = false }
                                                )
                                            }
                                        }
                                    }
                                }

                                // Variant dropdown
                                selectedTemplate?.takeIf { it.variants.isNotEmpty() }?.let { tmpl ->
                                    val noVariantLabel = stringResource(R.string.mobile_create_no_variant)
                                    Text(text = stringResource(R.string.mobile_create_variant), style = MaterialTheme.typography.titleSmall)
                                    val selectedVariantLabel = tmpl.variants
                                        .firstOrNull { it.id == createVariantId }?.label
                                        ?: noVariantLabel
                                    ExposedDropdownMenuBox(
                                        expanded = variantDropdownExpanded,
                                        onExpandedChange = { variantDropdownExpanded = it }
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
                                            onDismissRequest = { variantDropdownExpanded = false }
                                        ) {
                                            DropdownMenuItem(
                                                text = { Text(noVariantLabel) },
                                                onClick = { createVariantId = null; variantDropdownExpanded = false }
                                            )
                                            tmpl.variants.forEach { variant ->
                                                DropdownMenuItem(
                                                    text = { Text(variant.label) },
                                                    onClick = { createVariantId = variant.id; variantDropdownExpanded = false }
                                                )
                                            }
                                        }
                                    }
                                }

                                // Create button
                                selectedTemplate?.let { template ->
                                    Button(
                                        onClick = {
                                            val recType = if (createRecurrenceType == "template") null else createRecurrenceType
                                            val recInterval = if (createRecurrenceType == "every_x_days") createRecurrenceInterval else null
                                            onCreateChore(
                                                template.id,
                                                Instant.ofEpochMilli(createDueAtMillis).toString(),
                                                createAssigneeId,
                                                createAssignmentStrategy,
                                                recType,
                                                recInterval,
                                                createVariantId
                                            )
                                        },
                                        enabled = activeCreateAction == null,
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
                    }
                }
            }

            if (activeTab == MobileDashboardTab.SETTINGS) {
                item { SectionIntro(title = stringResource(R.string.mobile_settings_title), body = stringResource(R.string.mobile_settings_hint)) }
                item {
                    SettingsSectionCard(icon = Icons.Rounded.Tune, title = stringResource(R.string.mobile_settings_appearance)) {
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
                }
                item {
                    SettingsSectionCard(icon = Icons.Rounded.Smartphone, title = stringResource(R.string.mobile_settings_device)) {
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
                }
                item {
                    SettingsSectionCard(icon = Icons.Rounded.Language, title = stringResource(R.string.mobile_settings_release)) {
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
                }
                item {
                    SettingsSectionCard(icon = Icons.Rounded.DarkMode, title = stringResource(R.string.mobile_settings_actions)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(onClick = onRefresh, enabled = !isBusy) { Text(stringResource(R.string.mobile_refresh)) }
                            OutlinedButton(onClick = onLogout) { Text(stringResource(R.string.mobile_logout)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MobileTabButton(selected: Boolean, label: String, icon: ImageVector, onClick: () -> Unit) {
    val iconTint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    val chipColor = if (selected) {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.9f)
    }
    TextButton(
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
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
            )
        }
    }
}

@Composable
private fun MobileCenterTabButton(selected: Boolean, label: String, icon: ImageVector, onClick: () -> Unit) {
    val containerColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.82f)
    }
    val iconTint = MaterialTheme.colorScheme.onPrimary

    TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp)
    ) {
        Column(
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
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun DashboardStatusCard(
    isBusy: Boolean,
    isSyncingQueue: Boolean,
    errorMessage: String?,
    noticeMessage: String?,
    queuedSubmissionCount: Int,
    onRefresh: () -> Unit
) {
    Card(shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = onRefresh, enabled = !isBusy) {
                Icon(imageVector = Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.size(6.dp))
                Text(stringResource(if (isBusy) R.string.mobile_refreshing else R.string.mobile_refresh))
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
private fun SectionIntro(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Text(text = body, style = MaterialTheme.typography.bodyMedium)
    }
}

private fun LazyListScope.choreSection(
    chores: List<MobileChore>, title: String, currentUserId: String?, currentUserRole: String?, expandedChoreIds: Set<String>, onExpandedChange: (String) -> Unit,
    activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?, submitSelections: Map<String, Set<String>>, selectedProofUris: Map<String, List<String>>,
    onApprove: (String) -> Unit, onReject: (String) -> Unit, onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onStartChore: (String) -> Unit, onSubmitChore: (String) -> Unit
) {
    if (chores.isEmpty()) return
    item { Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
    items(chores, key = { it.id }) { chore ->
        ChoreCard(chore = chore, currentUserId = currentUserId, currentUserRole = currentUserRole, expanded = expandedChoreIds.contains(chore.id), activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, selectedChecklistIds = submitSelections[chore.id] ?: chore.completedChecklistIds.toSet(), selectedProofCount = selectedProofUris[chore.id]?.size ?: 0, onExpandedChange = { onExpandedChange(chore.id) }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onStartChore = onStartChore, onSubmitChore = onSubmitChore)
    }
}
private fun LazyListScope.historicChoreSection(
    chores: List<MobileChore>,
    title: String,
    expandedChoreIds: Set<String>,
    onExpandedChange: (String) -> Unit
) {
    if (chores.isEmpty()) return
    item { Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
    items(chores, key = { "historic_${it.id}" }) { chore ->
        HistoricChoreCard(
            chore = chore,
            expanded = expandedChoreIds.contains(chore.id),
            onExpandedChange = { onExpandedChange(chore.id) }
        )
    }
}

@Composable
private fun HistoricChoreCard(
    chore: MobileChore,
    expanded: Boolean,
    onExpandedChange: () -> Unit
) {
    Card(shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = chore.title, style = MaterialTheme.typography.titleMedium)
            Text(
                text = stringResource(R.string.mobile_due_at, formatApiTimestamp(chore.dueAt)),
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = chore.state.replace('_', ' '),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            OutlinedButton(onClick = onExpandedChange) {
                Text(stringResource(if (expanded) R.string.mobile_chore_close_history else R.string.mobile_chore_open_history))
            }
            if (expanded) {
                if (chore.checklist.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        chore.checklist.forEach { item ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Checkbox(
                                    checked = chore.completedChecklistIds.contains(item.id),
                                    onCheckedChange = null
                                )
                                Text(text = item.title, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
                if (chore.requirePhotoProof) {
                    Text(
                        text = stringResource(R.string.mobile_photo_required_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun ChoreCard(
    chore: MobileChore, currentUserId: String?, currentUserRole: String?, expanded: Boolean, activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?,
    selectedChecklistIds: Set<String>, selectedProofCount: Int, onExpandedChange: () -> Unit, onApprove: (String) -> Unit, onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onStartChore: (String) -> Unit, onSubmitChore: (String) -> Unit
) {
    val isPendingApproval = chore.state == "pending_approval"
    val isSubmittableState = chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
    val canManageTask = currentUserRole != "child" || chore.assigneeId == null || chore.assigneeId == currentUserId
    Card(shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = chore.title, style = MaterialTheme.typography.titleMedium)
            Text(text = stringResource(R.string.mobile_due_at, formatApiTimestamp(chore.dueAt)), style = MaterialTheme.typography.bodySmall)
            Text(text = describeChoreAssignment(chore, currentUserId), style = MaterialTheme.typography.bodySmall)
            Text(text = if (chore.isOverdue) stringResource(R.string.mobile_state_overdue) else chore.state.replace('_', ' '), style = MaterialTheme.typography.labelLarge)
            if (isPendingApproval) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { onApprove(chore.id) }, enabled = activeReviewAction == null) { Text(stringResource(if (activeReviewAction == "approve:${chore.id}") R.string.mobile_approving else R.string.mobile_approve)) }
                    OutlinedButton(onClick = { onReject(chore.id) }, enabled = activeReviewAction == null) { Text(stringResource(if (activeReviewAction == "reject:${chore.id}") R.string.mobile_rejecting else R.string.mobile_reject)) }
                }
                return@Column
            }
            if (isSubmittableState) {
                Button(onClick = onExpandedChange) { Text(stringResource(if (!canManageTask) R.string.mobile_view_task else if (expanded) R.string.mobile_hide_task_tools else R.string.mobile_work_task)) }
            }
            if (expanded) {
                if (!canManageTask) {
                    Text(text = stringResource(R.string.mobile_chore_read_only_hint), style = MaterialTheme.typography.bodySmall)
                }
                if (chore.checklist.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        chore.checklist.forEach { item ->
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Checkbox(checked = selectedChecklistIds.contains(item.id), onCheckedChange = { onToggleChecklistItem(chore.id, item.id, chore.completedChecklistIds) }, enabled = canManageTask && isSubmittableState)
                                Text(text = item.title, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
                if (selectedProofCount > 0) {
                    Text(text = stringResource(R.string.mobile_selected_photos, selectedProofCount), style = MaterialTheme.typography.bodySmall)
                } else if (chore.requirePhotoProof) {
                    Text(text = stringResource(R.string.mobile_photo_required_hint), style = MaterialTheme.typography.bodySmall)
                }
                if (canManageTask && isSubmittableState) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = { onStartChore(chore.id) }, enabled = activeStartAction == null && chore.state != "in_progress") { Text(stringResource(if (activeStartAction == "start:${chore.id}") R.string.mobile_starting else if (chore.state == "in_progress") R.string.mobile_started else R.string.mobile_start)) }
                        OutlinedButton(onClick = { onPickProofs(chore.id) }, enabled = activeSubmitAction == null) { Text(stringResource(R.string.mobile_pick_photos)) }
                    }
                    Button(onClick = { onSubmitChore(chore.id) }, enabled = activeSubmitAction == null) { Text(stringResource(if (activeSubmitAction == "submit:${chore.id}") R.string.mobile_submitting else R.string.mobile_submit)) }
                }
            }
        }
    }
}

@Composable
private fun MobileChoiceRow(options: List<MobileChoiceOption>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.chunked(2).forEach { rowOptions ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                rowOptions.forEach { option -> if (option.selected) Button(onClick = option.onClick) { Text(option.label) } else OutlinedButton(onClick = option.onClick) { Text(option.label) } }
            }
        }
    }
}

@Composable
private fun SettingsSectionCard(icon: ImageVector, title: String, content: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(24.dp)) {
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

private fun resolveChoreSection(chore: MobileChore, currentUserId: String?): MobileChoreSection = when {
    chore.assigneeId != null && chore.assigneeId == currentUserId -> MobileChoreSection.MINE
    chore.assigneeId.isNullOrBlank() -> MobileChoreSection.UNASSIGNED
    else -> MobileChoreSection.OTHERS
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
    MobileChoreSection.OTHERS -> stringResource(R.string.mobile_chore_assigned_elsewhere)
}

private fun defaultCreateDueAtMillis(): Long =
    Instant.now()
        .plus(4, ChronoUnit.HOURS)
        .truncatedTo(ChronoUnit.MINUTES)
        .toEpochMilli()

private fun formatEpochMillisForDisplay(value: Long): String =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(value))

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
