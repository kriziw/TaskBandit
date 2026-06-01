package com.taskbandit.app.viewmodels

import android.app.Application
import android.content.ContentResolver
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.taskbandit.app.BuildConfig
import com.taskbandit.app.R
import com.taskbandit.app.mobile.CreateChoreTemplateInput
import com.taskbandit.app.mobile.CreateRewardInput
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.MobileChoreSubmissionDraft
import com.taskbandit.app.mobile.MobileChoreTemplate
import com.taskbandit.app.mobile.MobileCompletionMilestone
import com.taskbandit.app.mobile.MobileFeatureAccess
import com.taskbandit.app.mobile.MobileHostedSubscriptionOverview
import com.taskbandit.app.mobile.MobileNotificationDevice
import com.taskbandit.app.mobile.MobileNotificationDeviceRegistration
import com.taskbandit.app.mobile.MobileDashboard
import com.taskbandit.app.mobile.MobileReleaseInfo
import com.taskbandit.app.mobile.TaskBanditDashboardCacheStore
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditSessionStore
import com.taskbandit.app.mobile.TaskBanditTransportException
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.mobile.TaskBanditWidgetStore
import com.taskbandit.app.mobile.UpdateRewardInput
import com.taskbandit.app.push.TaskBanditFirebasePushManager
import com.taskbandit.app.widget.TaskBanditWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale
import java.util.UUID
import kotlin.random.Random

// ── Shared data types used by both DashboardViewModel and DashboardScreen ───

internal enum class MobileCompletionCelebrationVariant {
    STANDARD,
    RARE,
    CHORE,
    PERFECT
}

internal data class MobileCompletionCelebration(
    val points: Int,
    val choreTitle: String,
    val titleResource: Int,
    val eyebrowResource: Int,
    val phraseResource: Int,
    val variant: MobileCompletionCelebrationVariant
)

internal data class GitHubReleaseInfo(val version: String, val apkDownloadUrl: String, val body: String)

// ── Celebration helpers ──────────────────────────────────────────────────────

private data class MobileChoreAwareCelebrationGroup(
    val keywords: List<String>,
    val phraseResources: List<Int>
)

private val mobileGenericCelebrationPhraseResources = listOf(
    R.string.mobile_celebration_phrase_1,
    R.string.mobile_celebration_phrase_2,
    R.string.mobile_celebration_phrase_3,
    R.string.mobile_celebration_phrase_4,
    R.string.mobile_celebration_phrase_5
)

private val mobileRareCelebrationPhraseResources = listOf(
    R.string.mobile_celebration_rare_phrase_1,
    R.string.mobile_celebration_rare_phrase_2,
    R.string.mobile_celebration_rare_phrase_3
)

private val mobilePerfectDayCelebrationPhraseResources = listOf(
    R.string.mobile_celebration_perfect_day_phrase_1,
    R.string.mobile_celebration_perfect_day_phrase_2,
    R.string.mobile_celebration_perfect_day_phrase_3
)

private val mobileChoreAwareCelebrationGroups = listOf(
    MobileChoreAwareCelebrationGroup(
        keywords = listOf("kitchen", "dish", "dishwasher", "plate", "fridge", "oven"),
        phraseResources = listOf(R.string.mobile_celebration_chore_kitchen_1, R.string.mobile_celebration_chore_kitchen_2)
    ),
    MobileChoreAwareCelebrationGroup(
        keywords = listOf("laundry", "clothes", "washing", "dryer", "fold", "linen"),
        phraseResources = listOf(R.string.mobile_celebration_chore_laundry_1, R.string.mobile_celebration_chore_laundry_2)
    ),
    MobileChoreAwareCelebrationGroup(
        keywords = listOf("clean", "tidy", "vacuum", "mop", "dust", "bathroom", "toilet"),
        phraseResources = listOf(R.string.mobile_celebration_chore_cleaning_1, R.string.mobile_celebration_chore_cleaning_2)
    ),
    MobileChoreAwareCelebrationGroup(
        keywords = listOf("trash", "rubbish", "garbage", "recycling", "waste", "bin"),
        phraseResources = listOf(R.string.mobile_celebration_chore_waste_1, R.string.mobile_celebration_chore_waste_2)
    ),
    MobileChoreAwareCelebrationGroup(
        keywords = listOf("plant", "water", "garden"),
        phraseResources = listOf(R.string.mobile_celebration_chore_plants_1, R.string.mobile_celebration_chore_plants_2)
    )
)

private fun pickRandomCelebrationResource(pool: List<Int>, previousResource: Int): Int {
    if (pool.size == 1) return pool.first()
    var next = pool[Random.nextInt(pool.size)]
    while (next == previousResource) {
        next = pool[Random.nextInt(pool.size)]
    }
    return next
}

private fun pickDeterministicCelebrationResource(pool: List<Int>, index: Int): Int {
    if (pool.isEmpty()) return R.string.mobile_celebration_phrase_1
    return pool[kotlin.math.abs(index) % pool.size]
}

internal fun buildMobileCompletionCelebration(
    chore: MobileChore,
    previousPhraseResource: Int
): MobileCompletionCelebration {
    val searchableChoreText = listOfNotNull(
        chore.groupTitle,
        chore.typeTitle,
        chore.subtypeLabel,
        chore.title
    ).joinToString(" ").lowercase(Locale.getDefault())
    val choreAwareGroup = mobileChoreAwareCelebrationGroups.firstOrNull { group ->
        group.keywords.any { keyword -> searchableChoreText.contains(keyword) }
    }
    val rareVariant = Random.nextInt(8) == 0

    return when {
        chore.completionMilestone?.type == "perfect_day" -> MobileCompletionCelebration(
            points = chore.awardedPoints.coerceAtLeast(0),
            choreTitle = chore.typeTitle.ifBlank { chore.title },
            titleResource = R.string.mobile_celebration_perfect_day_title,
            eyebrowResource = R.string.mobile_celebration_perfect_day_eyebrow,
            phraseResource = pickDeterministicCelebrationResource(
                mobilePerfectDayCelebrationPhraseResources,
                chore.completionMilestone.messageIndex
            ),
            variant = MobileCompletionCelebrationVariant.PERFECT
        )
        rareVariant -> MobileCompletionCelebration(
            points = chore.awardedPoints.coerceAtLeast(0),
            choreTitle = chore.typeTitle.ifBlank { chore.title },
            titleResource = R.string.mobile_celebration_rare_title,
            eyebrowResource = R.string.mobile_celebration_rare_eyebrow,
            phraseResource = pickRandomCelebrationResource(mobileRareCelebrationPhraseResources, previousPhraseResource),
            variant = MobileCompletionCelebrationVariant.RARE
        )
        choreAwareGroup != null -> MobileCompletionCelebration(
            points = chore.awardedPoints.coerceAtLeast(0),
            choreTitle = chore.typeTitle.ifBlank { chore.title },
            titleResource = R.string.mobile_celebration_chore_title,
            eyebrowResource = R.string.mobile_celebration_chore_eyebrow,
            phraseResource = pickRandomCelebrationResource(choreAwareGroup.phraseResources, previousPhraseResource),
            variant = MobileCompletionCelebrationVariant.CHORE
        )
        else -> MobileCompletionCelebration(
            points = chore.awardedPoints.coerceAtLeast(0),
            choreTitle = chore.typeTitle.ifBlank { chore.title },
            titleResource = R.string.mobile_celebration_title,
            eyebrowResource = R.string.mobile_celebration_eyebrow,
            phraseResource = pickRandomCelebrationResource(mobileGenericCelebrationPhraseResources, previousPhraseResource),
            variant = MobileCompletionCelebrationVariant.STANDARD
        )
    }
}

// ── Proof submission helpers ─────────────────────────────────────────────────

private data class ProofInput(
    val filename: String,
    val contentType: String,
    val bytes: ByteArray
)

private fun readProofInput(contentResolver: ContentResolver, uriString: String): ProofInput {
    val uri = Uri.parse(uriString)
    val filename = readUriDisplayName(contentResolver, uri)
    val contentType = contentResolver.getType(uri) ?: "image/jpeg"
    val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw IllegalStateException("Could not read the selected proof image.")
    return ProofInput(filename = filename, contentType = contentType, bytes = bytes)
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

internal fun createProofCaptureFile(context: android.content.Context): File {
    val proofDirectory = File(context.filesDir, "proof-captures").apply { mkdirs() }
    return File(proofDirectory, "proof-${UUID.randomUUID()}.jpg")
}

private fun submitDraft(
    api: TaskBanditMobileApi,
    baseUrl: String,
    token: String,
    draft: com.taskbandit.app.mobile.MobileChoreSubmissionDraft,
    contentResolver: ContentResolver
): MobileChore {
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
    return api.submitChore(
        baseUrl = baseUrl,
        token = token,
        instanceId = draft.choreId,
        completedChecklistItemIds = draft.completedChecklistIds,
        attachments = uploadedProofs,
        note = draft.note
    )
}

// ── GitHub release helper ────────────────────────────────────────────────────

internal fun fetchGitHubLatestRelease(): GitHubReleaseInfo? {
    val connection = java.net.URL(
        "https://api.github.com/repos/kriziw/TaskBandit/releases?per_page=10"
    ).openConnection() as java.net.HttpURLConnection
    connection.setRequestProperty("Accept", "application/vnd.github+json")
    connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
    connection.connectTimeout = 10_000
    connection.readTimeout = 10_000
    return try {
        if (connection.responseCode != 200) return null
        val responseText = connection.inputStream.bufferedReader().readText()
        val releases = org.json.JSONArray(responseText)
        for (i in 0 until releases.length()) {
            val json = releases.getJSONObject(i)
            if (json.optBoolean("draft") || json.optBoolean("prerelease")) continue
            val tagName = json.optString("tag_name", "")
            if (!tagName.startsWith("v")) continue
            val version = tagName.removePrefix("v")
            if (version.isBlank()) continue
            val body = json.optString("body", "")
            val assets = json.optJSONArray("assets") ?: continue
            var apkUrl: String? = null
            for (j in 0 until assets.length()) {
                val asset = assets.getJSONObject(j)
                if (asset.optString("name").endsWith(".apk")) {
                    apkUrl = asset.optString("browser_download_url").ifBlank { null }
                    break
                }
            }
            if (apkUrl != null) return GitHubReleaseInfo(version = version, apkDownloadUrl = apkUrl, body = body)
        }
        null
    } catch (_: Exception) {
        null
    } finally {
        connection.disconnect()
    }
}

// ── Device name / version helpers ───────────────────────────────────────────

internal fun buildAndroidDeviceName(): String {
    val manufacturer = Build.MANUFACTURER.orEmpty().trim()
    val model = Build.MODEL.orEmpty().trim()
    return listOf(manufacturer, model)
        .filter { it.isNotBlank() }
        .joinToString(" ")
        .ifBlank { "Android device" }
}

internal fun readAppVersion(context: android.content.Context): String? {
    return runCatching {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        val versionName = packageInfo.versionName?.ifBlank { BuildConfig.TASKBANDIT_RELEASE_VERSION }
            ?: BuildConfig.TASKBANDIT_RELEASE_VERSION
        "$versionName+${BuildConfig.TASKBANDIT_BUILD_NUMBER}"
    }.getOrNull()
}

// ── UI State ─────────────────────────────────────────────────────────────────

internal data class DashboardUiState(
    val dashboard: MobileDashboard? = null,
    val featureAccess: MobileFeatureAccess = MobileFeatureAccess(),
    val hostedSubscription: MobileHostedSubscriptionOverview = MobileHostedSubscriptionOverview(),
    val serverReleaseInfo: MobileReleaseInfo? = null,
    val notificationDevices: List<MobileNotificationDevice> = emptyList(),
    val serverUrl: String = "",
    val isBusy: Boolean = false,
    val errorMessage: String? = null,
    val noticeMessage: String? = null,
    val pendingReconnectActionLabel: String? = null,
    val validationDialogMessage: String? = null,
    val completionCelebration: MobileCompletionCelebration? = null,
    val lastCompletionCelebrationPhraseResource: Int = 0,
    val activeReviewAction: String? = null,
    val activeNotificationAction: String? = null,
    val activeStartAction: String? = null,
    val activeSubmitAction: String? = null,
    val activeCloseCycleAction: String? = null,
    val activeCancelChoreAction: String? = null,
    val activeExternalCompleteAction: String? = null,
    val activeTakeoverRequestAction: String? = null,
    val activeCreateAction: String? = null,
    val activeQuickLogAction: String? = null,
    val activeDueAtAction: String? = null,
    val activeDeviceAction: String? = null,
    val createSuccessCounter: Int = 0,
    val queuedSubmissionCount: Int = 0,
    val isSyncingQueue: Boolean = false,
    val refreshQueued: Boolean = false,
    val isDashboardSyncConnected: Boolean = true,
    val showDashboardSyncNotice: Boolean = false,
    val templateManagerTemplates: List<MobileChoreTemplate> = emptyList(),
    val templateManagerLoading: Boolean = false,
    val templateManagerError: String? = null,
    val submitSelections: Map<String, Set<String>> = emptyMap(),
    val selectedProofUris: Map<String, List<String>> = emptyMap(),
    val githubReleaseInfo: GitHubReleaseInfo? = null,
    val githubCheckDone: Boolean = false,
    val githubCheckError: Boolean = false,
    val dismissedUpdateKey: String = "",
    val dismissedGithubVersion: String = "",
    val isDownloadingUpdate: Boolean = false,
    val downloadProgress: Float = 0f,
    val downloadError: Boolean = false
)

// ── Events emitted by the ViewModel ─────────────────────────────────────────

internal sealed class DashboardEvent {
    object LogoutRequired : DashboardEvent()
    data class SessionUpdated(val baseUrl: String, val token: String) : DashboardEvent()
}

// ── ViewModel ────────────────────────────────────────────────────────────────

private data class MobileDashboardRefresh(
    val dashboard: MobileDashboard,
    val latestReleaseInfo: MobileReleaseInfo?,
    val notificationDevices: List<MobileNotificationDevice>,
    val hostedSubscription: MobileHostedSubscriptionOverview
)

private const val mutationReconnectWindowMs = 5000L
private const val mutationReconnectRetryDelayMs = 750L

internal class DashboardViewModel(
    application: Application,
    private val api: TaskBanditMobileApi,
    private val sessionStore: TaskBanditSessionStore,
    private val dashboardCacheStore: TaskBanditDashboardCacheStore,
    private val widgetStore: TaskBanditWidgetStore,
    private val installationId: String
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<DashboardEvent>()
    val events: SharedFlow<DashboardEvent> = _events.asSharedFlow()

    private val app get() = getApplication<Application>()
    private fun str(): (Int) -> String = app::getString

    // ── Mutation reconnect window ────────────────────────────────────────────

    private suspend fun <T> runMutationWithReconnectWindow(actionLabel: String, block: suspend () -> T): T {
        val deadline = System.currentTimeMillis() + mutationReconnectWindowMs
        var reconnecting = false
        try {
            while (true) {
                try {
                    return block()
                } catch (throwable: Throwable) {
                    if (throwable !is TaskBanditTransportException) throw throwable
                    val now = System.currentTimeMillis()
                    if (now >= deadline) throw IllegalStateException(str()(R.string.mobile_connection_restore_failed))
                    if (!reconnecting) {
                        reconnecting = true
                        _uiState.update { it.copy(pendingReconnectActionLabel = actionLabel) }
                    }
                    delay(minOf(mutationReconnectRetryDelayMs, deadline - now))
                }
            }
        } finally {
            _uiState.update { it.copy(pendingReconnectActionLabel = null) }
        }
    }

    // ── Feature access helpers ───────────────────────────────────────────────

    private fun hasFeatureAccess(check: (com.taskbandit.app.mobile.MobileFeatureAccess) -> Boolean): Boolean {
        return check(_uiState.value.featureAccess)
    }

    private suspend fun handleUnauthorized(throwable: Throwable) {
        if (throwable is TaskBanditUnauthorizedException) {
            _events.emit(DashboardEvent.LogoutRequired)
        }
    }

    // ── Dashboard loading ────────────────────────────────────────────────────

    fun refreshDashboard(baseUrl: String, token: String) {
        _uiState.update { it.copy(isBusy = true, refreshQueued = false, errorMessage = null) }

        viewModelScope.launch {
            val githubResult = runCatching { withContext(Dispatchers.IO) { fetchGitHubLatestRelease() } }
            _uiState.update { state ->
                state.copy(
                    githubReleaseInfo = githubResult.getOrNull(),
                    githubCheckError = githubResult.isFailure,
                    githubCheckDone = true
                )
            }
        }

        viewModelScope.launch {
            runCatching {
                val refreshPayload = withContext(Dispatchers.IO) {
                    val latestReleaseInfo = runCatching { api.getReleaseInfo(baseUrl) }.getOrNull()
                    runCatching {
                        val pushToken = TaskBanditFirebasePushManager.getTokenOrNull(app)
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
                                appVersion = readAppVersion(app),
                                locale = Locale.getDefault().toLanguageTag()
                            )
                        )
                    }
                    MobileDashboardRefresh(
                        dashboard = api.loadDashboard(baseUrl, token),
                        latestReleaseInfo = latestReleaseInfo,
                        hostedSubscription = runCatching {
                            api.getHostedSubscriptionOverview(baseUrl, token)
                        }.getOrDefault(MobileHostedSubscriptionOverview()),
                        notificationDevices = runCatching {
                            api.getNotificationDevices(baseUrl, token)
                        }.getOrDefault(emptyList())
                    )
                }
                refreshPayload
            }.onSuccess { loadedPayload ->
                val canonicalApiBaseUrl = loadedPayload.hostedSubscription.canonicalApiBaseUrl
                    ?.trim()?.ifBlank { null }
                val resolvedBaseUrl = canonicalApiBaseUrl ?: baseUrl
                dashboardCacheStore.save(resolvedBaseUrl, loadedPayload.dashboard)
                widgetStore.saveDashboard(loadedPayload.dashboard, 0)
                TaskBanditWidgetProvider.refreshAllWidgets(app)
                sessionStore.saveSession(resolvedBaseUrl, token)
                val freshFeatureAccess = loadedPayload.dashboard.user.featureAccess
                _uiState.update { state ->
                    state.copy(
                        dashboard = loadedPayload.dashboard,
                        featureAccess = freshFeatureAccess,
                        hostedSubscription = loadedPayload.hostedSubscription,
                        serverReleaseInfo = loadedPayload.latestReleaseInfo,
                        notificationDevices = loadedPayload.notificationDevices,
                        serverUrl = resolvedBaseUrl,
                        queuedSubmissionCount = 0,
                        isBusy = false,
                        isSyncingQueue = false
                    )
                }
                if (resolvedBaseUrl != baseUrl) {
                    _events.emit(DashboardEvent.SessionUpdated(resolvedBaseUrl, token))
                }
                val state = _uiState.value
                if (state.refreshQueued) {
                    _uiState.update { it.copy(refreshQueued = false) }
                    refreshDashboard(resolvedBaseUrl, token)
                }
            }.onFailure { throwable ->
                _uiState.update { it.copy(isBusy = false, isSyncingQueue = false) }
                if (throwable is TaskBanditUnauthorizedException) {
                    _events.emit(DashboardEvent.LogoutRequired)
                } else {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun requestDashboardRefresh(baseUrl: String, token: String) {
        if (_uiState.value.isBusy) {
            _uiState.update { it.copy(refreshQueued = true) }
            return
        }
        refreshDashboard(baseUrl, token)
    }

    fun checkForGithubUpdates() {
        _uiState.update { it.copy(githubCheckDone = false, githubCheckError = false) }
        viewModelScope.launch {
            val result = runCatching { withContext(Dispatchers.IO) { fetchGitHubLatestRelease() } }
            _uiState.update { it.copy(
                githubReleaseInfo = result.getOrNull(),
                githubCheckError = result.isFailure,
                githubCheckDone = true
            ) }
        }
    }

    fun dismissUpdateNotice(availableUpdateKey: String) {
        sessionStore.saveDismissedUpdateKey(availableUpdateKey)
        _uiState.update { it.copy(dismissedUpdateKey = availableUpdateKey) }
    }

    fun dismissGithubUpdate() {
        val version = _uiState.value.githubReleaseInfo?.version ?: return
        sessionStore.saveDismissedGithubVersion(version)
        _uiState.update { it.copy(dismissedGithubVersion = version) }
    }

    fun downloadAndInstall(info: GitHubReleaseInfo) {
        _uiState.update { it.copy(isDownloadingUpdate = true, downloadProgress = 0f, downloadError = false) }
        viewModelScope.launch(Dispatchers.IO) {
            downloadAndInstallApk(
                context = app,
                url = info.apkDownloadUrl,
                version = info.version,
                onProgress = { p -> _uiState.update { it.copy(downloadProgress = p) } },
                onDone = { _uiState.update { it.copy(isDownloadingUpdate = false) } },
                onError = { _uiState.update { it.copy(isDownloadingUpdate = false, downloadError = true) } }
            )
        }
    }

    fun initFromCache(baseUrl: String) {
        val dismissed = sessionStore.readDismissedUpdateKey()
        val dismissedGithub = sessionStore.readDismissedGithubVersion()
        val cached = dashboardCacheStore.read(baseUrl)?.dashboard
        _uiState.update { it.copy(
            dismissedUpdateKey = dismissed ?: "",
            dismissedGithubVersion = dismissedGithub ?: "",
            dashboard = cached ?: it.dashboard,
            featureAccess = cached?.user?.featureAccess ?: it.featureAccess
        ) }
    }

    // ── Chore actions ────────────────────────────────────────────────────────

    fun reviewPendingChore(instanceId: String, approve: Boolean, baseUrl: String, token: String) {
        if (!hasFeatureAccess { it.approvals }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_approvals_disabled)) }
            return
        }
        _uiState.update { it.copy(
            activeReviewAction = "${if (approve) "approve" else "reject"}:$instanceId",
            errorMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(
                        str()(if (approve) R.string.mobile_approving else R.string.mobile_rejecting)
                    ) {
                        if (approve) api.approveChore(baseUrl, token, instanceId)
                        else api.rejectChore(baseUrl, token, instanceId)
                    }
                }
            }.onSuccess { reviewedChore ->
                if (reviewedChore.completionMilestone?.type == "perfect_day") {
                    val prev = _uiState.value.lastCompletionCelebrationPhraseResource
                    val celebration = buildMobileCompletionCelebration(reviewedChore, prev)
                    _uiState.update { it.copy(
                        completionCelebration = celebration,
                        lastCompletionCelebrationPhraseResource = celebration.phraseResource
                    ) }
                }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeReviewAction = null) }
        }
    }

    fun markNotificationRead(notificationId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(
            activeNotificationAction = "notification:$notificationId",
            errorMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_marking_read)) {
                        api.markNotificationRead(baseUrl, token, notificationId)
                    }
                }
            }.onSuccess {
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeNotificationAction = null) }
        }
    }

    fun toggleChecklistItem(choreId: String, checklistItemId: String, defaultIds: List<String>) {
        val current = _uiState.value.submitSelections[choreId] ?: defaultIds.toSet()
        val next = current.toMutableSet()
        if (!next.add(checklistItemId)) next.remove(checklistItemId)
        _uiState.update { it.copy(submitSelections = it.submitSelections + (choreId to next)) }
    }

    fun addProofUris(choreId: String, uriStrings: List<String>) {
        val existing = _uiState.value.selectedProofUris[choreId].orEmpty()
        val merged = (existing + uriStrings).distinct()
        _uiState.update { it.copy(selectedProofUris = it.selectedProofUris + (choreId to merged)) }
    }

    fun startChore(choreId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(activeStartAction = "start:$choreId", errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_starting)) {
                        api.startChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_chore_started)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeStartAction = null) }
        }
    }

    fun takeOverChore(choreId: String, baseUrl: String, token: String) {
        if (!hasFeatureAccess { it.takeoverDirect }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_takeover_direct_disabled)) }
            return
        }
        _uiState.update { it.copy(activeStartAction = "takeover:$choreId", errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_taking_over_task)) {
                        api.takeOverChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_chore_taken_over)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeStartAction = null) }
        }
    }

    fun requestTakeover(choreId: String, requestedUserId: String, baseUrl: String, token: String) {
        if (!hasFeatureAccess { it.takeoverRequests }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_takeover_requests_disabled)) }
            return
        }
        _uiState.update { it.copy(
            activeTakeoverRequestAction = "request:$choreId:$requestedUserId",
            errorMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_request_takeover_sending)) {
                        api.requestTakeover(baseUrl, token, choreId, requestedUserId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_takeover_request_sent)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeTakeoverRequestAction = null) }
        }
    }

    fun respondToTakeoverRequest(requestId: String, approve: Boolean, baseUrl: String, token: String) {
        if (!hasFeatureAccess { it.takeoverRequests }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_takeover_requests_disabled)) }
            return
        }
        _uiState.update { it.copy(
            activeTakeoverRequestAction = "${if (approve) "approve" else "decline"}:$requestId",
            errorMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(
                        str()(if (approve) R.string.mobile_takeover_request_approving else R.string.mobile_takeover_request_declining)
                    ) {
                        if (approve) api.approveTakeoverRequest(baseUrl, token, requestId)
                        else api.declineTakeoverRequest(baseUrl, token, requestId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(
                    noticeMessage = str()(
                        if (approve) R.string.mobile_takeover_request_approved_notice
                        else R.string.mobile_takeover_request_declined_notice
                    )
                ) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeTakeoverRequestAction = null) }
        }
    }

    fun submitChore(choreId: String, baseUrl: String, token: String) {
        val state = _uiState.value
        val chore = state.dashboard?.chores?.firstOrNull { it.id == choreId } ?: return
        val selectedChecklistIds = (state.submitSelections[choreId] ?: chore.completedChecklistIds.toSet()).toList()
        val proofUriStrings = state.selectedProofUris[choreId].orEmpty()

        if (chore.requirePhotoProof && proofUriStrings.isEmpty()) {
            _uiState.update { it.copy(validationDialogMessage = str()(R.string.mobile_photo_required_missing)) }
            return
        }
        if (chore.requirePhotoProof && !hasFeatureAccess { it.proofUploads }) {
            _uiState.update { it.copy(validationDialogMessage = str()(R.string.mobile_feature_proof_uploads_disabled)) }
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

        _uiState.update { it.copy(activeSubmitAction = "submit:$choreId", errorMessage = null, noticeMessage = null) }

        viewModelScope.launch {
            try {
                val submittedChore = withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_submitting)) {
                        submitDraft(
                            api = api,
                            baseUrl = baseUrl,
                            token = token,
                            draft = draft,
                            contentResolver = app.contentResolver
                        )
                    }
                }
                if (submittedChore.state == "completed") {
                    val prev = _uiState.value.lastCompletionCelebrationPhraseResource
                    val celebration = buildMobileCompletionCelebration(submittedChore, prev)
                    _uiState.update { it.copy(
                        completionCelebration = celebration,
                        lastCompletionCelebrationPhraseResource = celebration.phraseResource
                    ) }
                }
                _uiState.update { s ->
                    s.copy(
                        selectedProofUris = s.selectedProofUris - choreId,
                        submitSelections = s.submitSelections - choreId,
                        dashboard = s.dashboard?.copy(
                            chores = s.dashboard.chores.filterNot { it.id == choreId }
                        ),
                        noticeMessage = str()(R.string.mobile_submission_sent)
                    )
                }
                requestDashboardRefresh(baseUrl, token)
            } catch (throwable: Throwable) {
                if (throwable is TaskBanditUnauthorizedException) {
                    _events.emit(DashboardEvent.LogoutRequired)
                } else {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_connection_restore_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeSubmitAction = null) }
        }
    }

    fun createChore(
        templateId: String,
        dueAtIsoUtc: String,
        assigneeId: String?,
        assignmentStrategy: String,
        recurrenceType: String?,
        recurrenceIntervalDays: Int?,
        recurrenceWeekdays: List<String>,
        recurrenceEndMode: String?,
        recurrenceOccurrences: Int?,
        recurrenceEndsAtIsoUtc: String?,
        variantId: String? = null,
        baseUrl: String,
        token: String
    ) {
        if (!hasFeatureAccess { it.choresManage }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_chores_manage_disabled)) }
            return
        }
        val canUseReassignment = hasFeatureAccess { it.reassignment }
        val sanitizedAssigneeId = if (canUseReassignment) assigneeId else null
        _uiState.update { it.copy(
            activeCreateAction = "create:$templateId",
            errorMessage = null,
            noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_create_creating)) {
                        api.createChoreInstance(
                            baseUrl = baseUrl,
                            token = token,
                            templateId = templateId,
                            dueAtIsoUtc = dueAtIsoUtc,
                            assigneeId = sanitizedAssigneeId,
                            assignmentStrategy = assignmentStrategy,
                            recurrenceType = recurrenceType,
                            recurrenceIntervalDays = recurrenceIntervalDays,
                            recurrenceWeekdays = recurrenceWeekdays,
                            recurrenceEndMode = recurrenceEndMode,
                            recurrenceOccurrences = recurrenceOccurrences,
                            recurrenceEndsAtIsoUtc = recurrenceEndsAtIsoUtc,
                            suppressRecurrence = recurrenceType == "none",
                            variantId = variantId
                        )
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(createSuccessCounter = it.createSuccessCounter + 1) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_create_chore_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeCreateAction = null) }
        }
    }

    fun quickLog(
        instanceId: String?,
        templateId: String?,
        title: String?,
        note: String?,
        createTemplateFromEntry: Boolean,
        pointsOverride: Int?,
        baseUrl: String,
        token: String
    ) {
        val role = _uiState.value.dashboard?.user?.role
        if (role != "admin" && role != "parent") {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_quick_log_disabled)) }
            return
        }
        if (!hasFeatureAccess { it.quickLog }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_quick_log_disabled)) }
            return
        }
        val normalizedTitle = title?.trim().orEmpty()
        if (instanceId.isNullOrBlank() && templateId.isNullOrBlank() && normalizedTitle.isBlank()) {
            _uiState.update { it.copy(validationDialogMessage = app.getString(R.string.mobile_quick_log_require_input)) }
            return
        }
        _uiState.update { it.copy(
            activeQuickLogAction = "quick-log",
            errorMessage = null,
            noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_quick_log_saving)) {
                        api.quickLog(
                            baseUrl = baseUrl,
                            token = token,
                            instanceId = instanceId,
                            templateId = templateId,
                            title = normalizedTitle.ifBlank { null },
                            note = note,
                            createTemplateFromEntry = createTemplateFromEntry,
                            pointsOverride = pointsOverride
                        )
                    }
                }
            }.onSuccess { loggedChore ->
                _uiState.update { s ->
                    val existing = s.dashboard?.chores.orEmpty()
                    var replaced = false
                    val updated = buildList {
                        existing.forEach { chore ->
                            if (chore.id == loggedChore.id) { add(loggedChore); replaced = true }
                            else add(chore)
                        }
                        if (!replaced) add(0, loggedChore)
                    }
                    s.copy(
                        dashboard = s.dashboard?.copy(chores = updated),
                        noticeMessage = str()(R.string.mobile_quick_log_success)
                    )
                }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_quick_log_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeQuickLogAction = null) }
        }
    }

    fun updateChoreDueAt(choreId: String, dueAtIsoUtc: String, title: String, variantId: String?, baseUrl: String, token: String) {
        if (!hasFeatureAccess { it.choresManage }) {
            _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_feature_chores_manage_disabled)) }
            return
        }
        val chore = _uiState.value.dashboard?.chores?.firstOrNull { it.id == choreId } ?: return
        _uiState.update { it.copy(
            activeDueAtAction = "update-due:$choreId",
            errorMessage = null,
            noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_updating_due_at)) {
                        api.updateChoreDueAt(baseUrl, token, chore, dueAtIsoUtc, title, variantId)
                    }
                }
            }.onSuccess { updatedChore ->
                _uiState.update { s ->
                    s.copy(
                        dashboard = s.dashboard?.copy(
                            chores = s.dashboard.chores.map { if (it.id == choreId) updatedChore else it }
                        ),
                        noticeMessage = str()(R.string.mobile_due_at_updated)
                    )
                }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_due_at_update_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeDueAtAction = null) }
        }
    }

    fun cancelChore(choreId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(
            activeCancelChoreAction = "cancel:$choreId",
            errorMessage = null, noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_cancelling_chore)) {
                        api.cancelChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_chore_cancelled)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_cancel_chore_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeCancelChoreAction = null) }
        }
    }

    fun closeChoreCycle(choreId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(
            activeCloseCycleAction = "cancel-series:$choreId",
            errorMessage = null, noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_cancelling_series)) {
                        api.cancelChoreSeries(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_series_cancelled)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_cancel_series_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeCloseCycleAction = null) }
        }
    }

    fun cancelChoreOccurrence(choreId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(
            activeCloseCycleAction = "cancel-occurrence:$choreId",
            errorMessage = null, noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_cancelling_occurrence)) {
                        api.cancelChoreOccurrence(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_occurrence_cancelled)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_cancel_occurrence_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeCloseCycleAction = null) }
        }
    }

    fun completeChoreExternally(choreId: String, externalCompleterName: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(
            activeExternalCompleteAction = "complete-external:$choreId",
            errorMessage = null, noticeMessage = null
        ) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_completing_external)) {
                        api.completeExternalChore(baseUrl, token, choreId, externalCompleterName)
                    }
                }
            }.onSuccess {
                _uiState.update { it.copy(noticeMessage = str()(R.string.mobile_complete_external_success)) }
                requestDashboardRefresh(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(
                        errorMessage = throwable.message ?: str()(R.string.mobile_complete_external_failed)
                    ) }
                }
            }
            _uiState.update { it.copy(activeExternalCompleteAction = null) }
        }
    }

    fun removeNotificationDevice(deviceId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(activeDeviceAction = "remove:$deviceId", errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(str()(R.string.mobile_device_removing)) {
                        api.deleteNotificationDevice(baseUrl, token, deviceId)
                    }
                }
            }.onSuccess { devices ->
                _uiState.update { it.copy(
                    notificationDevices = devices,
                    noticeMessage = str()(R.string.mobile_device_removed)
                ) }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
            _uiState.update { it.copy(activeDeviceAction = null) }
        }
    }

    // ── Rewards ──────────────────────────────────────────────────────────────

    fun redeemReward(rewardId: String, baseUrl: String, token: String, targetDate: String? = null) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.redeemReward(baseUrl, token, rewardId, targetDate) }
            }.onSuccess { redemption ->
                _uiState.update { s ->
                    s.copy(
                        dashboard = s.dashboard?.copy(
                            redemptions = s.dashboard.redemptions + redemption,
                            user = if (redemption.status == "APPROVED") {
                                s.dashboard.user.copy(points = s.dashboard.user.points - redemption.pointsDeducted)
                            } else s.dashboard.user
                        )
                    )
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun resolveRedemption(redemptionId: String, approved: Boolean, note: String? = null, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.resolveRedemption(baseUrl, token, redemptionId, approved, note) }
            }.onSuccess { updated ->
                _uiState.update { s ->
                    s.copy(
                        dashboard = s.dashboard?.copy(
                            redemptions = s.dashboard.redemptions.map { r ->
                                if (r.id == updated.id) updated else r
                            }
                        )
                    )
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun rescheduleRedemption(redemptionId: String, targetDate: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.rescheduleRedemption(baseUrl, token, redemptionId, targetDate) }
            }.onSuccess { result ->
                _uiState.update { s ->
                    val updated = s.dashboard?.redemptions?.map { r ->
                        when {
                            r.id == result.id -> result           // updated in-place (PENDING→PENDING)
                            r.id == redemptionId -> r.copy(status = "CANCELLED")  // old APPROVED cancelled
                            else -> r
                        }
                    } ?: return@onSuccess
                    // If result is a new redemption (different ID), add it
                    val withNew = if (updated.none { it.id == result.id }) updated + result else updated
                    s.copy(dashboard = s.dashboard.copy(redemptions = withNew))
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun createReward(input: CreateRewardInput, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.createReward(baseUrl, token, input) }
            }.onSuccess { created ->
                _uiState.update { s ->
                    s.copy(dashboard = s.dashboard?.copy(rewards = s.dashboard.rewards + created))
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun updateReward(rewardId: String, input: UpdateRewardInput, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.updateReward(baseUrl, token, rewardId, input) }
            }.onSuccess { updated ->
                _uiState.update { s ->
                    s.copy(dashboard = s.dashboard?.copy(
                        rewards = s.dashboard.rewards.map { if (it.id == updated.id) updated else it }
                    ))
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun deleteReward(rewardId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.deleteReward(baseUrl, token, rewardId) }
            }.onSuccess {
                _uiState.update { s ->
                    s.copy(dashboard = s.dashboard?.copy(
                        rewards = s.dashboard.rewards.filter { it.id != rewardId }
                    ))
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    fun toggleReward(rewardId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.toggleRewardEnabled(baseUrl, token, rewardId) }
            }.onSuccess { updated ->
                _uiState.update { s ->
                    s.copy(dashboard = s.dashboard?.copy(
                        rewards = s.dashboard.rewards.map { if (it.id == updated.id) updated else it }
                    ))
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(errorMessage = throwable.message) }
                }
            }
        }
    }

    // ── Template manager ─────────────────────────────────────────────────────

    fun loadTemplatesForManager(baseUrl: String, token: String) {
        _uiState.update { it.copy(templateManagerLoading = true, templateManagerError = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.getChoreTemplates(baseUrl, token) }
            }.onSuccess { result ->
                _uiState.update { it.copy(templateManagerTemplates = result, templateManagerLoading = false) }
            }.onFailure { throwable ->
                _uiState.update { it.copy(templateManagerLoading = false) }
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(templateManagerError = throwable.message) }
                }
            }
        }
    }

    fun createTemplate(input: CreateChoreTemplateInput, baseUrl: String, token: String) {
        _uiState.update { it.copy(templateManagerError = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.createChoreTemplate(baseUrl, token, input) }
            }.onSuccess { created ->
                _uiState.update { s ->
                    s.copy(
                        templateManagerTemplates = s.templateManagerTemplates + created,
                        dashboard = s.dashboard?.copy(templates = s.dashboard.templates + created)
                    )
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(templateManagerError = throwable.message) }
                }
            }
        }
    }

    fun updateTemplate(templateId: String, input: CreateChoreTemplateInput, baseUrl: String, token: String) {
        _uiState.update { it.copy(templateManagerError = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.updateChoreTemplate(baseUrl, token, templateId, input) }
            }.onSuccess { updated ->
                _uiState.update { s ->
                    s.copy(
                        templateManagerTemplates = s.templateManagerTemplates.map { if (it.id == updated.id) updated else it },
                        dashboard = s.dashboard?.copy(
                            templates = s.dashboard.templates.map { if (it.id == updated.id) updated else it }
                        )
                    )
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(templateManagerError = throwable.message) }
                }
            }
        }
    }

    fun deleteTemplate(templateId: String, baseUrl: String, token: String) {
        _uiState.update { it.copy(templateManagerError = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.deleteChoreTemplate(baseUrl, token, templateId) }
            }.onSuccess {
                _uiState.update { s ->
                    s.copy(
                        templateManagerTemplates = s.templateManagerTemplates.filter { it.id != templateId },
                        dashboard = s.dashboard?.copy(
                            templates = s.dashboard.templates.filter { it.id != templateId }
                        )
                    )
                }
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(templateManagerError = throwable.message) }
                }
            }
        }
    }

    fun resetTemplatesToDefaults(baseUrl: String, token: String) {
        _uiState.update { it.copy(templateManagerError = null) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.resetTemplatesToDefaults(baseUrl, token) }
            }.onSuccess {
                loadTemplatesForManager(baseUrl, token)
            }.onFailure { throwable ->
                handleUnauthorized(throwable)
                if (throwable !is TaskBanditUnauthorizedException) {
                    _uiState.update { it.copy(templateManagerError = throwable.message) }
                }
            }
        }
    }

    // ── UI state helpers ─────────────────────────────────────────────────────

    fun clearValidationDialog() = _uiState.update { it.copy(validationDialogMessage = null) }
    fun clearCompletionCelebration() = _uiState.update { it.copy(completionCelebration = null) }
    fun clearNoticeMessage() = _uiState.update { it.copy(noticeMessage = null) }
    fun setNoticeMessage(message: String) = _uiState.update { it.copy(noticeMessage = message) }
    fun setErrorMessage(message: String?) = _uiState.update { it.copy(errorMessage = message) }
    fun setSyncConnected(connected: Boolean) = _uiState.update { it.copy(isDashboardSyncConnected = connected) }
    fun setShowSyncNotice(show: Boolean) = _uiState.update { it.copy(showDashboardSyncNotice = show) }
    fun setSyncingQueue(syncing: Boolean) = _uiState.update { it.copy(isSyncingQueue = syncing) }

    // ── Factory ──────────────────────────────────────────────────────────────

    companion object {
        fun factory(
            api: TaskBanditMobileApi,
            sessionStore: TaskBanditSessionStore,
            dashboardCacheStore: TaskBanditDashboardCacheStore,
            widgetStore: TaskBanditWidgetStore,
            installationId: String
        ) = viewModelFactory {
            initializer {
                val application = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY]!!
                DashboardViewModel(
                    application = application,
                    api = api,
                    sessionStore = sessionStore,
                    dashboardCacheStore = dashboardCacheStore,
                    widgetStore = widgetStore,
                    installationId = installationId
                )
            }
        }
    }
}

// ── APK download helper (needs Context, stays in this module) ────────────────

internal fun downloadAndInstallApk(
    context: android.content.Context,
    url: String,
    version: String,
    onProgress: (Float) -> Unit,
    onDone: () -> Unit,
    onError: () -> Unit
) {
    val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
    try {
        val dir = java.io.File(context.cacheDir, "apk-downloads").also {
            it.deleteRecursively()
            it.mkdirs()
        }
        val file = java.io.File(dir, "taskbandit-$version.apk")
        val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 120_000
        connection.connect()
        val total = connection.contentLengthLong
        var downloaded = 0L
        connection.inputStream.use { input ->
            file.outputStream().use { output ->
                val buffer = ByteArray(8192)
                var read: Int
                while (input.read(buffer).also { read = it } != -1) {
                    output.write(buffer, 0, read)
                    downloaded += read
                    if (total > 0) {
                        val progress = downloaded.toFloat() / total
                        mainHandler.post { onProgress(progress) }
                    }
                }
            }
        }
        mainHandler.post { onDone() }
        val fileUri = androidx.core.content.FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", file
        )
        val installIntent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, "application/vnd.android.package-archive")
            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(installIntent)
    } catch (_: Exception) {
        mainHandler.post { onError() }
    }
}
