package com.taskbandit.app

import android.Manifest
import android.content.ContentResolver
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.taskbandit.app.mobile.MobileDashboard
import com.taskbandit.app.mobile.MobileNotificationDeviceRegistration
import com.taskbandit.app.mobile.MobileUploadedProof
import com.taskbandit.app.mobile.TaskBanditMobileApi
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
    UPDATES
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sharedPreferences = getSharedPreferences("taskbandit-session", MODE_PRIVATE)
        val sessionStore = TaskBanditSessionStore(sharedPreferences)
        val outboxStore = TaskBanditOutboxStore(sharedPreferences)
        val widgetStore = TaskBanditWidgetStore(sharedPreferences)

        setContent {
            TaskBanditTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    TaskBanditApp(
                        api = TaskBanditMobileApi(),
                        sessionStore = sessionStore,
                        outboxStore = outboxStore,
                        widgetStore = widgetStore
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskBanditApp(
    api: TaskBanditMobileApi,
    sessionStore: TaskBanditSessionStore,
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
    var session by remember { mutableStateOf(sessionStore.readSession()) }
    val currentReleaseInfo = remember {
        MobileReleaseInfo(
            releaseVersion = BuildConfig.TASKBANDIT_RELEASE_VERSION,
            buildNumber = BuildConfig.TASKBANDIT_BUILD_NUMBER,
            commitSha = BuildConfig.TASKBANDIT_COMMIT_SHA
        )
    }
    val installationId = remember { sessionStore.getOrCreateInstallationId() }
    var serverUrl by remember { mutableStateOf(session.baseUrl) }
    var email by remember { mutableStateOf("alex@taskbandit.local") }
    var password by remember { mutableStateOf("TaskBandit123!") }
    var dashboard by remember { mutableStateOf<MobileDashboard?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }
    var serverReleaseInfo by remember { mutableStateOf<MobileReleaseInfo?>(null) }
    var dismissedUpdateKey by remember { mutableStateOf(sessionStore.readDismissedUpdateKey()) }
    var isBusy by remember { mutableStateOf(session.token != null) }
    var isSyncingQueue by remember { mutableStateOf(false) }
    var activeReviewAction by remember { mutableStateOf<String?>(null) }
    var activeNotificationAction by remember { mutableStateOf<String?>(null) }
    var activeStartAction by remember { mutableStateOf<String?>(null) }
    var activeSubmitAction by remember { mutableStateOf<String?>(null) }
    var activeCreateAction by remember { mutableStateOf<String?>(null) }
    var submitSelections by remember { mutableStateOf<Map<String, Set<String>>>(emptyMap()) }
    var selectedProofUris by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var pendingPhotoPickerChoreId by remember { mutableStateOf<String?>(null) }
    var queuedSubmissionCount by remember { mutableIntStateOf(outboxStore.readQueue().size) }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { }

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
        isBusy = false
        errorMessage = null
        noticeMessage = null
    }

    fun refreshDashboard() {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        isBusy = true
        errorMessage = null

        coroutineScope.launch {
            runCatching {
                val (loadedDashboard, latestReleaseInfo) = withContext(Dispatchers.IO) {
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

                    Pair(api.loadDashboard(baseUrl, token), latestReleaseInfo)
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
                    Triple(
                        withContext(Dispatchers.IO) {
                            api.loadDashboard(baseUrl, token)
                        },
                        flushedCount,
                        latestReleaseInfo
                    )
                } else {
                    Triple(loadedDashboard, 0, latestReleaseInfo)
                }
            }.onSuccess { (loadedDashboard, flushedCount, latestReleaseInfo) ->
                dashboard = loadedDashboard
                serverReleaseInfo = latestReleaseInfo
                serverUrl = baseUrl
                sessionStore.saveSession(baseUrl, token)
                val currentQueuedSubmissionCount = outboxStore.readQueue().size
                queuedSubmissionCount = currentQueuedSubmissionCount
                widgetStore.saveDashboard(loadedDashboard, currentQueuedSubmissionCount)
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
        }
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
                refreshDashboard()
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
                refreshDashboard()
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
                refreshDashboard()
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
                refreshDashboard()
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

    fun createChore(templateId: String, delayHours: Int) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        val resolvedDelayHours = delayHours.coerceAtLeast(1)
        activeCreateAction = "create:$templateId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val dueAt = Instant.now()
                        .plus(resolvedDelayHours.toLong(), ChronoUnit.HOURS)
                        .toString()
                    api.createChoreInstance(
                        baseUrl = baseUrl,
                        token = token,
                        templateId = templateId,
                        dueAtIsoUtc = dueAt
                    )
                }
            }.onSuccess {
                noticeMessage = choreCreatedMessage
                refreshDashboard()
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

    LaunchedEffect(session.token) {
        if (session.token != null) {
            if (
                TaskBanditFirebasePushManager.isConfigured() &&
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            refreshDashboard()
        }
    }

    LaunchedEffect(serverUrl, session.token) {
        if (session.token != null) {
            return@LaunchedEffect
        }

        val baseUrl = normalizedServerUrl()
        runCatching {
            withContext(Dispatchers.IO) {
                api.getReleaseInfo(baseUrl)
            }
        }.onSuccess { latestReleaseInfo ->
            serverReleaseInfo = latestReleaseInfo
        }.onFailure {
            serverReleaseInfo = null
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
            isBusy = isBusy,
            isSyncingQueue = isSyncingQueue,
            activeReviewAction = activeReviewAction,
            activeNotificationAction = activeNotificationAction,
            activeStartAction = activeStartAction,
            activeSubmitAction = activeSubmitAction,
            activeCreateAction = activeCreateAction,
            errorMessage = errorMessage,
            noticeMessage = noticeMessage,
            queuedSubmissionCount = queuedSubmissionCount,
            onDismissUpdate = ::dismissUpdateNotice,
            onRefresh = ::refreshDashboard,
            onLogout = ::logout,
            onApprove = { instanceId -> reviewPendingChore(instanceId, true) },
            onReject = { instanceId -> reviewPendingChore(instanceId, false) },
            onNotificationRead = ::markNotificationRead,
            onToggleChecklistItem = ::toggleChecklistItem,
            submitSelections = submitSelections,
            selectedProofUris = selectedProofUris,
            onPickProofs = ::openProofPicker,
            onStartChore = ::startChore,
            onSubmitChore = ::submitChore,
            onCreateChore = ::createChore
        )
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
private fun DashboardActionCard(
    badge: String,
    title: String,
    body: String,
    actionLabel: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = badge,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodySmall
            )
            Button(
                onClick = onClick,
                enabled = enabled,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(actionLabel)
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
    isBusy: Boolean,
    isSyncingQueue: Boolean,
    activeReviewAction: String?,
    activeNotificationAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCreateAction: String?,
    errorMessage: String?,
    noticeMessage: String?,
    queuedSubmissionCount: Int,
    onDismissUpdate: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onNotificationRead: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onPickProofs: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onSubmitChore: (String) -> Unit,
    onCreateChore: (String, Int) -> Unit
) {
    val pendingApprovals = dashboard?.chores.orEmpty().filter { it.state == "pending_approval" }
    val visibleChores = dashboard?.chores.orEmpty().filter { it.state != "pending_approval" }
    val isCreatorRole = dashboard?.user?.role == "admin" || dashboard?.user?.role == "parent"
    var activeTab by rememberSaveable { mutableStateOf(MobileDashboardTab.CHORES) }
    var createDelayHours by rememberSaveable { mutableStateOf(4) }
    var expandedChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    val createDelayOptions = listOf(2, 4, 8, 24, 48)

    LaunchedEffect(isCreatorRole) {
        if (!isCreatorRole && activeTab == MobileDashboardTab.CREATE) {
            activeTab = MobileDashboardTab.CHORES
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = activeTab == MobileDashboardTab.CHORES,
                    onClick = { activeTab = MobileDashboardTab.CHORES },
                    icon = { Text("✓") },
                    label = { Text(stringResource(R.string.mobile_tab_chores)) }
                )
                if (isCreatorRole) {
                    NavigationBarItem(
                        selected = activeTab == MobileDashboardTab.CREATE,
                        onClick = { activeTab = MobileDashboardTab.CREATE },
                        icon = { Text("+") },
                        label = { Text(stringResource(R.string.mobile_tab_create)) }
                    )
                }
                NavigationBarItem(
                    selected = activeTab == MobileDashboardTab.UPDATES,
                    onClick = { activeTab = MobileDashboardTab.UPDATES },
                    icon = { Text("!") },
                    label = { Text(stringResource(R.string.mobile_tab_updates)) }
                )
            }
        }
    ) { padding ->
        LazyColumn(
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
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = dashboard?.user?.displayName ?: stringResource(R.string.common_loading_short),
                            style = MaterialTheme.typography.headlineMedium
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
                        Text(
                            text = serverUrl,
                            style = MaterialTheme.typography.bodySmall
                        )
                        Text(
                            text = stringResource(
                                R.string.mobile_dashboard_summary,
                                dashboard?.pendingApprovals ?: 0,
                                dashboard?.activeChores ?: 0,
                                dashboard?.user?.currentStreak ?: 0
                            ),
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Text(
                            text = stringResource(R.string.mobile_dashboard_start_here),
                            style = MaterialTheme.typography.titleSmall
                        )
                        DashboardActionCard(
                            badge = stringResource(R.string.mobile_dashboard_primary_badge),
                            title = stringResource(R.string.mobile_dashboard_primary_title),
                            body = stringResource(R.string.mobile_dashboard_primary_body),
                            actionLabel = stringResource(
                                if (activeTab == MobileDashboardTab.CHORES) {
                                    R.string.mobile_dashboard_here
                                } else {
                                    R.string.mobile_dashboard_open_chores
                                }
                            ),
                            enabled = activeTab != MobileDashboardTab.CHORES,
                            onClick = {
                                activeTab = MobileDashboardTab.CHORES
                                expandedChoreIds = emptySet()
                            }
                        )
                        DashboardActionCard(
                            badge = stringResource(R.string.mobile_dashboard_secondary_badge),
                            title = stringResource(R.string.mobile_dashboard_secondary_title),
                            body = stringResource(
                                if (isCreatorRole) {
                                    R.string.mobile_dashboard_secondary_body
                                } else {
                                    R.string.mobile_dashboard_secondary_body_locked
                                }
                            ),
                            actionLabel = stringResource(
                                when {
                                    !isCreatorRole -> R.string.mobile_dashboard_admin_only
                                    activeTab == MobileDashboardTab.CREATE -> R.string.mobile_dashboard_here
                                    else -> R.string.mobile_dashboard_open_create
                                }
                            ),
                            enabled = isCreatorRole && activeTab != MobileDashboardTab.CREATE,
                            onClick = { activeTab = MobileDashboardTab.CREATE }
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(onClick = onRefresh, enabled = !isBusy) {
                                Text(
                                    stringResource(
                                        if (isBusy) R.string.mobile_refreshing else R.string.mobile_refresh
                                    )
                                )
                            }
                            Button(onClick = onLogout) {
                                Text(stringResource(R.string.mobile_logout))
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
                            Text(
                                text = noticeMessage,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        if (!errorMessage.isNullOrBlank()) {
                            Text(
                                text = errorMessage,
                                color = MaterialTheme.colorScheme.error
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
                    }
                }
            }

            if (activeTab == MobileDashboardTab.CHORES) {
                item {
                    Text(
                        text = stringResource(R.string.mobile_my_chores),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                if (pendingApprovals.isNotEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_pending_approvals),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    items(pendingApprovals) { chore ->
                        Card {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(text = chore.title, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = stringResource(
                                        R.string.mobile_due_at,
                                        formatApiTimestamp(chore.dueAt)
                                    ),
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Button(
                                        onClick = { onApprove(chore.id) },
                                        enabled = activeReviewAction == null
                                    ) {
                                        Text(
                                            stringResource(
                                                if (activeReviewAction == "approve:${chore.id}") {
                                                    R.string.mobile_approving
                                                } else {
                                                    R.string.mobile_approve
                                                }
                                            )
                                        )
                                    }
                                    Button(
                                        onClick = { onReject(chore.id) },
                                        enabled = activeReviewAction == null
                                    ) {
                                        Text(
                                            stringResource(
                                                if (activeReviewAction == "reject:${chore.id}") {
                                                    R.string.mobile_rejecting
                                                } else {
                                                    R.string.mobile_reject
                                                }
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                if (visibleChores.isEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_no_chores),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    items(visibleChores) { chore ->
                        val selectedChecklistIds = submitSelections[chore.id] ?: chore.completedChecklistIds.toSet()
                        val selectedProofCount = selectedProofUris[chore.id]?.size ?: 0
                        val isSubmittableState = chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
                        val showDetails = expandedChoreIds.contains(chore.id)

                        Card {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(text = chore.title, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = stringResource(
                                        R.string.mobile_due_at,
                                        formatApiTimestamp(chore.dueAt)
                                    ),
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Text(
                                    text = if (chore.isOverdue) {
                                        stringResource(R.string.mobile_state_overdue)
                                    } else {
                                        chore.state.replace('_', ' ')
                                    },
                                    style = MaterialTheme.typography.labelLarge
                                )
                                if (isSubmittableState) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = { onStartChore(chore.id) },
                                            enabled = activeStartAction == null && chore.state != "in_progress"
                                        ) {
                                            Text(
                                                stringResource(
                                                    if (activeStartAction == "start:${chore.id}") {
                                                        R.string.mobile_starting
                                                    } else if (chore.state == "in_progress") {
                                                        R.string.mobile_started
                                                    } else {
                                                        R.string.mobile_start
                                                    }
                                                )
                                            )
                                        }
                                        Button(
                                            onClick = { onSubmitChore(chore.id) },
                                            enabled = activeSubmitAction == null
                                        ) {
                                            Text(
                                                stringResource(
                                                    if (activeSubmitAction == "submit:${chore.id}") {
                                                        R.string.mobile_submitting
                                                    } else {
                                                        R.string.mobile_submit
                                                    }
                                                )
                                            )
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = { onPickProofs(chore.id) },
                                            enabled = activeSubmitAction == null
                                        ) {
                                            Text(stringResource(R.string.mobile_pick_photos))
                                        }
                                        TextButton(
                                            onClick = {
                                                expandedChoreIds = if (showDetails) {
                                                    expandedChoreIds - chore.id
                                                } else {
                                                    expandedChoreIds + chore.id
                                                }
                                            }
                                        ) {
                                            Text(
                                                stringResource(
                                                    if (showDetails) {
                                                        R.string.mobile_hide_details
                                                    } else {
                                                        R.string.mobile_show_details
                                                    }
                                                )
                                            )
                                        }
                                    }
                                }
                                if (showDetails && chore.checklist.isNotEmpty()) {
                                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        chore.checklist.forEach { item ->
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                Checkbox(
                                                    checked = selectedChecklistIds.contains(item.id),
                                                    onCheckedChange = {
                                                        onToggleChecklistItem(
                                                            chore.id,
                                                            item.id,
                                                            chore.completedChecklistIds
                                                        )
                                                    },
                                                    enabled = isSubmittableState
                                                )
                                                Text(
                                                    text = item.title,
                                                    style = MaterialTheme.typography.bodyMedium
                                                )
                                            }
                                        }
                                    }
                                }
                                if (showDetails) {
                                    if (selectedProofCount > 0) {
                                        Text(
                                            text = stringResource(R.string.mobile_selected_photos, selectedProofCount),
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    } else if (chore.requirePhotoProof) {
                                        Text(
                                            text = stringResource(R.string.mobile_photo_required_hint),
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.CREATE) {
                item {
                    Text(
                        text = stringResource(R.string.mobile_create_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                item {
                    Text(
                        text = stringResource(R.string.mobile_create_hint),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        createDelayOptions.forEach { delay ->
                            Button(
                                onClick = { createDelayHours = delay },
                                enabled = createDelayHours != delay
                            ) {
                                Text(stringResource(R.string.mobile_create_delay_option, delay))
                            }
                        }
                    }
                }

                if (!isCreatorRole) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_create_no_permission),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else if (dashboard?.templates.orEmpty().isEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_create_no_templates),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    items(dashboard?.templates.orEmpty()) { template ->
                        Card {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = template.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.weight(1f)
                                )
                                Button(
                                    onClick = { onCreateChore(template.id, createDelayHours) },
                                    enabled = activeCreateAction == null
                                ) {
                                    if (activeCreateAction == "create:${template.id}") {
                                        Text(stringResource(R.string.mobile_create_creating))
                                    } else {
                                        Text(
                                            stringResource(
                                                R.string.mobile_create_action,
                                                createDelayHours
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.UPDATES) {
                item {
                    Text(
                        text = stringResource(R.string.mobile_notifications),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                if (dashboard?.notifications.orEmpty().isEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_notifications_empty),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    items(dashboard?.notifications.orEmpty().take(5)) { notification ->
                        Card {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(text = notification.title, style = MaterialTheme.typography.titleMedium)
                                Text(text = notification.message, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = formatApiTimestamp(notification.createdAt),
                                    style = MaterialTheme.typography.bodySmall
                                )
                                if (!notification.isRead) {
                                    Button(
                                        onClick = { onNotificationRead(notification.id) },
                                        enabled = activeNotificationAction == null
                                    ) {
                                        Text(
                                            stringResource(
                                                if (activeNotificationAction == "notification:${notification.id}") {
                                                    R.string.mobile_marking_read
                                                } else {
                                                    R.string.mobile_mark_read
                                                }
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = stringResource(R.string.mobile_leaderboard),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                items(dashboard?.leaderboard.orEmpty().take(5)) { entry ->
                    Card {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(text = entry.displayName, style = MaterialTheme.typography.titleMedium)
                                Text(text = entry.role, style = MaterialTheme.typography.bodySmall)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = stringResource(R.string.mobile_points_value, entry.points),
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = stringResource(R.string.mobile_streak_value, entry.currentStreak),
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
