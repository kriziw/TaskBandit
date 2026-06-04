@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.annotation.DrawableRes
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.os.LocaleListCompat
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.AssignmentTurnedIn
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.HowToReg
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.PeopleAlt
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Switch
import androidx.compose.material3.TopAppBar
import com.taskbandit.app.mobile.MobileReward
import com.taskbandit.app.mobile.MobileRedemption
import com.taskbandit.app.mobile.CreateRewardInput
import com.taskbandit.app.mobile.UpdateRewardInput
import com.taskbandit.app.mobile.CreateChoreTemplateInput
import com.taskbandit.app.mobile.CreateTemplateChecklistItemInput
import com.taskbandit.app.mobile.CreateTemplateVariantInput
import com.taskbandit.app.mobile.MobileVariantLabelTranslation
import com.taskbandit.app.mobile.MobileTemplateDependencyRule
import com.taskbandit.app.mobile.MobileTemplateTranslation
import com.taskbandit.app.mobile.MobileTemplateChecklistItem
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.taskbandit.app.mobile.MobileDashboard
import com.taskbandit.app.mobile.MobileDashboardSyncSignal
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.MobileAuthProviders
import com.taskbandit.app.mobile.MobileChoreTemplate
import com.taskbandit.app.mobile.MobileFeatureAccess
import com.taskbandit.app.mobile.MobileNotificationDevice
import com.taskbandit.app.mobile.MobileNotificationDeviceRegistration
import com.taskbandit.app.mobile.MobileHostedSubscriptionOverview
import com.taskbandit.app.mobile.MobileLeaderboardEntry
import com.taskbandit.app.mobile.MobileTakeoverRequest
import com.taskbandit.app.mobile.MobileTemplateRecurrence
import com.taskbandit.app.mobile.MobileThemeMode
import com.taskbandit.app.mobile.MobileUploadedProof
import com.taskbandit.app.mobile.MobileOnboardingDeepLink
import com.taskbandit.app.mobile.MobileResolvedInvite
import com.taskbandit.app.mobile.TaskBanditDashboardSyncClient
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditOnboardingDeepLinks
import com.taskbandit.app.mobile.TaskBanditAppPreferencesStore
import com.taskbandit.app.mobile.TaskBanditDashboardCacheStore
import com.taskbandit.app.mobile.TaskBanditOutboxStore
import com.taskbandit.app.mobile.MobileChoreSubmissionDraft
import com.taskbandit.app.mobile.TaskBanditSession
import com.taskbandit.app.mobile.TaskBanditSessionStore
import com.taskbandit.app.mobile.TaskBanditTransportException
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.mobile.TaskBanditWidgetStore
import com.taskbandit.app.mobile.MobileReleaseInfo
import com.taskbandit.app.mobile.MobileSignupRequest
import com.taskbandit.app.mobile.MobilePublicEnrollmentSiteConfig
import com.taskbandit.app.mobile.MobileOnboardingAnswers
import com.taskbandit.app.push.TaskBanditFirebasePushManager
import com.taskbandit.app.ui.screens.DashboardScreen
import com.taskbandit.app.ui.screens.OnboardingWizardScreen
import com.taskbandit.app.ui.theme.TaskBanditTheme
import com.taskbandit.app.viewmodels.DashboardEvent
import com.taskbandit.app.viewmodels.DashboardViewModel
import com.taskbandit.app.viewmodels.createProofCaptureFile
import com.taskbandit.app.viewmodels.downloadAndInstallApk
import com.taskbandit.app.widget.TaskBanditWidgetProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.time.Instant
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.io.File
import java.util.Locale
import java.util.UUID
import kotlin.random.Random

internal const val defaultApiBaseUrl = "https://api.taskbandit.app"
private const val androidOidcCallbackUrl = "taskbandit://auth/callback"
private const val syncDisconnectNoticeDelayMs = 3500L
private const val syncStartupNoticeGraceMs = 6000L

private data class AndroidOidcResult(
    val accessToken: String? = null,
    val errorMessage: String? = null
)


internal data class TemplateCreateCapabilities(
    val canOpenCreateTab: Boolean,
    val canEditTemplates: Boolean
)

internal fun resolveTemplateCreateCapabilities(
    featureAccess: MobileFeatureAccess
): TemplateCreateCapabilities {
    return TemplateCreateCapabilities(
        canOpenCreateTab = featureAccess.choresManage,
        canEditTemplates = featureAccess.templatesManage
    )
}

class MainActivity : AppCompatActivity() {
    private val pendingOidcResult = mutableStateOf<AndroidOidcResult?>(null)
    private val pendingOnboardingDeepLink = mutableStateOf<MobileOnboardingDeepLink?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        val sharedPreferences = getSharedPreferences("taskbandit-session", MODE_PRIVATE)
        val sessionStore = TaskBanditSessionStore(sharedPreferences)
        val appPreferencesStore = TaskBanditAppPreferencesStore(sharedPreferences)
        val widgetStore = TaskBanditWidgetStore(sharedPreferences)
        val dashboardCacheStore = TaskBanditDashboardCacheStore(sharedPreferences)
        val initialLanguageTag = appPreferencesStore.readLanguageTag()
        val initialLocaleList = if (initialLanguageTag == "system") {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(initialLanguageTag)
        }

        AppCompatDelegate.setApplicationLocales(initialLocaleList)
        super.onCreate(savedInstanceState)
        consumeIncomingIntent(intent)

        setContent {
            TaskBanditApp(
                api = TaskBanditMobileApi(),
                sessionStore = sessionStore,
                appPreferencesStore = appPreferencesStore,
                widgetStore = widgetStore,
                dashboardCacheStore = dashboardCacheStore,
                pendingOidcResult = pendingOidcResult,
                pendingOnboardingDeepLink = pendingOnboardingDeepLink
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        consumeIncomingIntent(intent)
    }

    private fun consumeIncomingIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "taskbandit" && data.host == "auth" && data.path == "/callback") {
            val accessToken = data.getQueryParameter("oidcToken")
            val errorMessage = data.getQueryParameter("oidcError")
            pendingOidcResult.value = AndroidOidcResult(
                accessToken = accessToken?.takeIf { it.isNotBlank() },
                errorMessage = errorMessage?.takeIf { it.isNotBlank() }
            )
            intent.data = null
            return
        }

        val onboardingDeepLink = TaskBanditOnboardingDeepLinks.parse(data) ?: return
        pendingOnboardingDeepLink.value = onboardingDeepLink
        intent.data = null
    }
}


@Composable
private fun TaskBanditApp(
    api: TaskBanditMobileApi,
    sessionStore: TaskBanditSessionStore,
    appPreferencesStore: TaskBanditAppPreferencesStore,
    widgetStore: TaskBanditWidgetStore,
    dashboardCacheStore: TaskBanditDashboardCacheStore,
    pendingOidcResult: MutableState<AndroidOidcResult?>,
    pendingOnboardingDeepLink: MutableState<MobileOnboardingDeepLink?>
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val installationId = remember { sessionStore.getOrCreateInstallationId() }

    // ── Login-screen & preference state (lives in composition) ───────────────
    var session by remember { mutableStateOf(sessionStore.readSession()) }
    var themeMode by remember { mutableStateOf(appPreferencesStore.readThemeMode()) }
    var languageTag by remember { mutableStateOf(appPreferencesStore.readLanguageTag()) }
    var mobileAvatarKey by remember { mutableStateOf(appPreferencesStore.readMobileAvatarKey()) }
    var serverUrl by remember { mutableStateOf(session.baseUrl) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var registrationDisplayName by remember { mutableStateOf("") }
    var registrationEmail by remember { mutableStateOf("") }
    var registrationPassword by remember { mutableStateOf("") }
    var onboardingDeepLink by remember { mutableStateOf<MobileOnboardingDeepLink?>(null) }
    var onboardingInvite by remember { mutableStateOf<MobileResolvedInvite?>(null) }
    var setupWizardStep by remember { mutableIntStateOf(0) }
    var setupWizardRedoRequested by rememberSaveable { mutableStateOf(false) }
    var setupWizardAnswers by remember {
        mutableStateOf(MobileOnboardingAnswers(
            householdType = "",
            homeType = "",
            appliances = emptyList(),
            pets = emptyList(),
            cookingStyle = "",
            choreSplit = "shared_evenly",
            gamificationStyle = "",
            childAges = emptyList()
        ))
    }
    var authProviders by remember { mutableStateOf<MobileAuthProviders?>(null) }
    var authProvidersCheckedBaseUrl by remember { mutableStateOf<String?>(null) }
    var isAuthProvidersLoading by remember { mutableStateOf(false) }
    var authProvidersErrorMessage by remember { mutableStateOf<String?>(null) }
    var hostedEnrollmentConfig by remember { mutableStateOf<MobilePublicEnrollmentSiteConfig?>(null) }
    var loginIsBusy by remember { mutableStateOf(false) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }
    var loginScreenServerReleaseInfo by remember { mutableStateOf<MobileReleaseInfo?>(null) }
    var pendingPhotoPickerChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureUriString by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureFilePath by remember { mutableStateOf<String?>(null) }
    var pendingSettingsLogExportContent by remember { mutableStateOf<String?>(null) }
    var syncNoticeGraceUntilEpochMillis by remember {
        mutableLongStateOf(
            if (session.token != null) System.currentTimeMillis() + syncStartupNoticeGraceMs else 0L
        )
    }
    var notificationsPermissionGranted by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
        )
    }
    val currentReleaseInfo = remember {
        MobileReleaseInfo(
            releaseVersion = BuildConfig.TASKBANDIT_RELEASE_VERSION,
            buildNumber = BuildConfig.TASKBANDIT_BUILD_NUMBER,
            commitSha = BuildConfig.TASKBANDIT_COMMIT_SHA
        )
    }
    val dashboardSyncClient = remember { TaskBanditDashboardSyncClient() }

    // ── ViewModel ─────────────────────────────────────────────────────────────
    val dashboardViewModel: DashboardViewModel = viewModel(
        factory = DashboardViewModel.factory(api, sessionStore, dashboardCacheStore, widgetStore, installationId)
    )
    val dashboardState by dashboardViewModel.uiState.collectAsStateWithLifecycle()

    // Pre-fill wizard from server draft when dashboard first loads (must be after dashboardState)
    val dashboardDraft = dashboardState.dashboard?.onboardingDraft
    if (dashboardDraft != null && setupWizardAnswers.householdType.isBlank()) {
        setupWizardAnswers = dashboardDraft
    }

    fun normalizedSetupWizardAnswers(base: MobileOnboardingAnswers?): MobileOnboardingAnswers {
        return MobileOnboardingAnswers(
            householdType = base?.householdType?.ifBlank { "family" } ?: "family",
            homeType = base?.homeType?.ifBlank { "house" } ?: "house",
            appliances = base?.appliances.orEmpty(),
            pets = base?.pets.orEmpty(),
            cookingStyle = base?.cookingStyle?.ifBlank { "mixed" } ?: "mixed",
            choreSplit = base?.choreSplit?.ifBlank { "shared_evenly" } ?: "shared_evenly",
            gamificationStyle = base?.gamificationStyle?.ifBlank { "default" } ?: "default",
            childAges = base?.childAges.orEmpty()
        )
    }

    // ── Local helpers ─────────────────────────────────────────────────────────

    fun normalizedServerUrl() = serverUrl.trim().ifBlank { defaultApiBaseUrl }

    fun resolveLoginScreenErrorMessage(throwable: Throwable): String =
        throwable.message ?: context.getString(R.string.mobile_login_failed)

    fun clearAuthProviderState() {
        authProviders = null
        authProvidersCheckedBaseUrl = null
        authProvidersErrorMessage = null
        isAuthProvidersLoading = false
        hostedEnrollmentConfig = null
    }

    fun hasFreshAuthProviderState(baseUrl: String) = authProvidersCheckedBaseUrl == baseUrl

    fun logout() {
        val baseUrl = normalizedServerUrl()
        sessionStore.clearToken(baseUrl)
        dashboardCacheStore.clear()
        widgetStore.clear()
        TaskBanditWidgetProvider.refreshAllWidgets(context)
        session = TaskBanditSession(baseUrl = baseUrl, token = null)
        serverUrl = baseUrl
        loginIsBusy = false
        loginErrorMessage = null
        registrationDisplayName = ""
        registrationEmail = ""
        registrationPassword = ""
        setupWizardAnswers = MobileOnboardingAnswers(
            householdType = "",
            homeType = "",
            appliances = emptyList(),
            pets = emptyList(),
            cookingStyle = "",
            choreSplit = "shared_evenly",
            gamificationStyle = "",
            childAges = emptyList()
        )
        setupWizardRedoRequested = false
        setupWizardStep = 0
        clearAuthProviderState()
        dashboardViewModel.setErrorMessage(null)
        dashboardViewModel.clearNoticeMessage()
        dashboardViewModel.setSyncConnected(true)
        dashboardViewModel.setShowSyncNotice(false)
    }

    fun withAuth(block: (baseUrl: String, token: String) -> Unit) {
        val token = session.token ?: return
        block(normalizedServerUrl(), token)
    }

    fun refreshAuthProviders(targetBaseUrl: String = normalizedServerUrl()) {
        if (targetBaseUrl.isBlank()) {
            clearAuthProviderState()
            return
        }
        isAuthProvidersLoading = true
        authProvidersErrorMessage = null
        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    Pair(
                        api.getAuthProviders(targetBaseUrl),
                        runCatching { api.getPublicEnrollmentSiteConfig(targetBaseUrl) }.getOrNull()
                    )
                }
            }.onSuccess { (providers, enrollmentConfig) ->
                authProviders = providers
                hostedEnrollmentConfig = enrollmentConfig
                authProvidersCheckedBaseUrl = targetBaseUrl
            }.onFailure { throwable ->
                authProviders = null
                hostedEnrollmentConfig = null
                authProvidersCheckedBaseUrl = targetBaseUrl
                authProvidersErrorMessage = resolveLoginScreenErrorMessage(throwable)
            }
            isAuthProvidersLoading = false
        }
    }

    fun openSetupWizardForRedo() {
        setupWizardStep = 0
        setupWizardAnswers = normalizedSetupWizardAnswers(dashboardDraft ?: setupWizardAnswers)
        setupWizardRedoRequested = true
    }

    // ── Activity result launchers ─────────────────────────────────────────────

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        notificationsPermissionGranted = granted
    }

    val avatarImagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        runCatching {
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
        }
        val nextAvatarKey = "upload:${uri}"
        mobileAvatarKey = nextAvatarKey
        appPreferencesStore.saveMobileAvatarKey(nextAvatarKey)
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
            dashboardViewModel.addProofUris(choreId, uris.map(Uri::toString))
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
            dashboardViewModel.addProofUris(choreId, listOf(uriString))
        } else if (!success && !filePath.isNullOrBlank()) {
            runCatching { File(filePath).delete() }
        }
        pendingPhotoCaptureChoreId = null
        pendingPhotoCaptureUriString = null
        pendingPhotoCaptureFilePath = null
    }

    val settingsLogExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/plain")
    ) { uri ->
        val exportContent = pendingSettingsLogExportContent
        pendingSettingsLogExportContent = null
        if (uri == null || exportContent.isNullOrBlank()) return@rememberLauncherForActivityResult
        runCatching {
            context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
                writer.write(exportContent)
            } ?: throw IllegalStateException("Unable to open the selected destination.")
        }.onSuccess {
            dashboardViewModel.setNoticeMessage(context.getString(R.string.mobile_settings_logs_saved))
        }.onFailure { throwable ->
            dashboardViewModel.setErrorMessage(throwable.message)
        }
    }

    // ── Helpers that use launchers ────────────────────────────────────────────

    fun openProofPicker(choreId: String) {
        val featureAccess = dashboardState.dashboard?.user?.featureAccess
            ?: com.taskbandit.app.mobile.MobileFeatureAccess()
        if (!featureAccess.proofUploads) {
            dashboardViewModel.setNoticeMessage(
                context.getString(R.string.mobile_feature_proof_uploads_disabled)
            )
            return
        }
        pendingPhotoPickerChoreId = choreId
        proofPicker.launch(arrayOf("image/*"))
    }

    fun takeProofPhoto(choreId: String) {
        val featureAccess = dashboardState.dashboard?.user?.featureAccess
            ?: com.taskbandit.app.mobile.MobileFeatureAccess()
        if (!featureAccess.proofUploads) {
            dashboardViewModel.setNoticeMessage(
                context.getString(R.string.mobile_feature_proof_uploads_disabled)
            )
            return
        }
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

    fun downloadSettingsLogs() {
        val safeTimestamp = Instant.now().toString().replace(":", "-")
        pendingSettingsLogExportContent = buildSettingsLogReport(
            installationId = installationId,
            currentReleaseInfo = currentReleaseInfo,
            serverReleaseInfo = dashboardState.serverReleaseInfo,
            serverUrl = normalizedServerUrl(),
            themeMode = themeMode,
            languageTag = languageTag,
            notificationsPermissionGranted = notificationsPermissionGranted,
            notificationDevices = dashboardState.notificationDevices
        )
        settingsLogExportLauncher.launch("taskbandit-settings-$safeTimestamp.txt")
    }

    // ── LaunchedEffects ───────────────────────────────────────────────────────

    LaunchedEffect(languageTag) {
        val localeList = if (languageTag == "system") {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(languageTag)
        }
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    LaunchedEffect(dashboardState.noticeMessage) {
        if (dashboardState.noticeMessage != null) {
            kotlinx.coroutines.delay(4000)
            dashboardViewModel.clearNoticeMessage()
        }
    }

    LaunchedEffect(Unit) {
        dashboardViewModel.events.collect { event ->
            when (event) {
                is DashboardEvent.LogoutRequired -> logout()
                is DashboardEvent.SessionUpdated -> {
                    serverUrl = event.baseUrl
                    session = TaskBanditSession(baseUrl = event.baseUrl, token = event.token)
                }
            }
        }
    }

    LaunchedEffect(session.token) {
        if (session.token != null) {
            syncNoticeGraceUntilEpochMillis = System.currentTimeMillis() + syncStartupNoticeGraceMs
        } else {
            syncNoticeGraceUntilEpochMillis = 0L
        }
        dashboardViewModel.setShowSyncNotice(false)
    }

    LaunchedEffect(
        dashboardState.isDashboardSyncConnected,
        session.token,
        syncNoticeGraceUntilEpochMillis,
        dashboardState.pendingReconnectActionLabel,
        dashboardState.queuedSubmissionCount
    ) {
        if (session.token == null) {
            dashboardViewModel.setShowSyncNotice(false)
            return@LaunchedEffect
        }
        val hasSyncFailureContext =
            !dashboardState.pendingReconnectActionLabel.isNullOrBlank() ||
                dashboardState.queuedSubmissionCount > 0
        if (dashboardState.isDashboardSyncConnected || !hasSyncFailureContext) {
            dashboardViewModel.setShowSyncNotice(false)
        } else {
            val now = System.currentTimeMillis()
            val startupGraceRemainingMs = (syncNoticeGraceUntilEpochMillis - now).coerceAtLeast(0L)
            if (startupGraceRemainingMs > 0L) {
                delay(startupGraceRemainingMs)
            }
            delay(syncDisconnectNoticeDelayMs)
            val hasSyncFailureNow =
                !dashboardState.pendingReconnectActionLabel.isNullOrBlank() ||
                    dashboardState.queuedSubmissionCount > 0
            if (session.token != null && !dashboardState.isDashboardSyncConnected && hasSyncFailureNow) {
                dashboardViewModel.setShowSyncNotice(true)
            }
        }
    }

    LaunchedEffect(session.token) {
        if (session.token != null) {
            val baseUrl = normalizedServerUrl()
            dashboardViewModel.initFromCache(baseUrl)
            if (
                TaskBanditFirebasePushManager.isConfigured() &&
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            dashboardViewModel.requestDashboardRefresh(baseUrl, session.token!!)
        }
    }

    val activeBaseUrl = normalizedServerUrl()

    LaunchedEffect(activeBaseUrl, session.token) {
        val token = session.token ?: return@LaunchedEffect
        runCatching {
            dashboardSyncClient.connect(activeBaseUrl, token).collect { signal ->
                when (signal) {
                    MobileDashboardSyncSignal.Connected ->
                        dashboardViewModel.setSyncConnected(true)
                    MobileDashboardSyncSignal.Disconnected ->
                        dashboardViewModel.setSyncConnected(false)
                    MobileDashboardSyncSignal.RefreshRequested ->
                        dashboardViewModel.requestDashboardRefresh(activeBaseUrl, token)
                    MobileDashboardSyncSignal.Unauthorized -> logout()
                }
            }
        }.onFailure {
            dashboardViewModel.setSyncConnected(false)
        }
    }

    LaunchedEffect(activeBaseUrl, session.token) {
        if (session.token != null) return@LaunchedEffect
        runCatching {
            withContext(Dispatchers.IO) { api.getReleaseInfo(activeBaseUrl) }
        }.onSuccess { latestReleaseInfo ->
            loginScreenServerReleaseInfo = latestReleaseInfo
        }.onFailure {
            loginScreenServerReleaseInfo = null
        }
    }

    LaunchedEffect(session.token) {
        if (session.token != null) return@LaunchedEffect
        val baseUrl = normalizedServerUrl()
        if (!hasFreshAuthProviderState(baseUrl)) {
            refreshAuthProviders(baseUrl)
        }
    }

    LaunchedEffect(pendingOnboardingDeepLink.value) {
        val deepLink = pendingOnboardingDeepLink.value ?: return@LaunchedEffect
        pendingOnboardingDeepLink.value = null
        onboardingDeepLink = deepLink
        if (!deepLink.email.isNullOrBlank() && email.isBlank()) {
            email = deepLink.email
        }
        runCatching {
            withContext(Dispatchers.IO) {
                api.resolveTenantInvite(
                    controlPlaneBaseUrl = deepLink.controlPlaneBaseUrl,
                    inviteToken = deepLink.inviteToken,
                    expectedTenantSlug = deepLink.tenantSlug
                )
            }
        }.onSuccess { resolvedInvite ->
            onboardingInvite = resolvedInvite
            val resolvedApiBaseUrl = resolvedInvite.tenantContext.tenantApiUrl.trim()
                .ifBlank { deepLink.tenantApiUrl?.trim().orEmpty() }
                .ifBlank { defaultApiBaseUrl }
            serverUrl = resolvedApiBaseUrl
            sessionStore.saveBaseUrl(resolvedApiBaseUrl)
            dashboardViewModel.setNoticeMessage(
                context.getString(R.string.mobile_onboarding_invite_loaded)
            )
            loginErrorMessage = null
        }.onFailure { throwable ->
            deepLink.tenantApiUrl
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?.let { fallbackApiUrl ->
                    serverUrl = fallbackApiUrl
                    sessionStore.saveBaseUrl(fallbackApiUrl)
                }
            loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
        }
    }

    LaunchedEffect(pendingOidcResult.value) {
        val oidcResult = pendingOidcResult.value ?: return@LaunchedEffect
        pendingOidcResult.value = null
        when {
            !oidcResult.accessToken.isNullOrBlank() -> {
                val baseUrl = normalizedServerUrl()
                dashboardCacheStore.clear()
                serverUrl = baseUrl
                sessionStore.saveSession(baseUrl, oidcResult.accessToken)
                session = TaskBanditSession(baseUrl = baseUrl, token = oidcResult.accessToken)
                loginErrorMessage = null
            }
            !oidcResult.errorMessage.isNullOrBlank() -> {
                loginErrorMessage = oidcResult.errorMessage
            }
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && session.token != null) {
                val token = session.token ?: return@LifecycleEventObserver
                dashboardViewModel.requestDashboardRefresh(normalizedServerUrl(), token)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // ── Derived values ────────────────────────────────────────────────────────

    val effectiveServerReleaseInfo =
        if (session.token != null) dashboardState.serverReleaseInfo else loginScreenServerReleaseInfo
    val availableUpdate = effectiveServerReleaseInfo?.takeIf {
        compareReleaseInfo(currentReleaseInfo, it) < 0
    }
    val availableUpdateKey = availableUpdate?.let(::createReleaseKey)
    val visibleUpdate = availableUpdate?.takeIf { availableUpdateKey != dashboardState.dismissedUpdateKey }
    val currentReleaseLabel = formatReleaseLabel(currentReleaseInfo)
    val serverReleaseLabel = effectiveServerReleaseInfo?.let(::formatReleaseLabel)
    val visibleGithubUpdate = dashboardState.githubReleaseInfo?.takeIf { info ->
        dashboardState.githubCheckDone &&
            compareReleaseVersions(BuildConfig.TASKBANDIT_RELEASE_VERSION, info.version) < 0 &&
            info.version != dashboardState.dismissedGithubVersion
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
                    authProviders = authProviders,
                    hostedEnrollmentConfig = hostedEnrollmentConfig,
                    authProvidersCheckedBaseUrl = authProvidersCheckedBaseUrl,
                    isAuthProvidersLoading = isAuthProvidersLoading,
                    authProvidersErrorMessage = authProvidersErrorMessage,
                    email = email,
                    password = password,
                    registrationDisplayName = registrationDisplayName,
                    registrationEmail = registrationEmail,
                    registrationPassword = registrationPassword,
                    isBusy = loginIsBusy,
                    errorMessage = loginErrorMessage,
                    onboardingHint = onboardingInvite?.let {
                        context.getString(R.string.mobile_onboarding_hint, it.tenantContext.tenantSlug)
                    },
                    onServerUrlChange = {
                        val previousBaseUrl = normalizedServerUrl()
                        serverUrl = it
                        sessionStore.saveBaseUrl(it.trim())
                        val nextBaseUrl = it.trim().ifBlank { defaultApiBaseUrl }
                        if (previousBaseUrl != nextBaseUrl) {
                            clearAuthProviderState()
                        }
                    },
                    onEmailChange = { email = it },
                    onPasswordChange = { password = it },
                    onRegistrationDisplayNameChange = { registrationDisplayName = it },
                    onRegistrationEmailChange = { registrationEmail = it },
                    onRegistrationPasswordChange = { registrationPassword = it },
                    onCheckSignInMethods = { refreshAuthProviders() },
                    onOidcLogin = {
                        val baseUrl = normalizedServerUrl()
                        loginErrorMessage = null
                        runCatching {
                            val resolvedLanguageTag =
                                if (languageTag == "system") Locale.getDefault().toLanguageTag()
                                else languageTag
                            val oidcIntent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse(
                                    api.getOidcStartUrl(baseUrl, resolvedLanguageTag, androidOidcCallbackUrl)
                                )
                            )
                            context.startActivity(oidcIntent)
                        }.onFailure { throwable ->
                            loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
                        }
                    },
                    onLogin = {
                        loginIsBusy = true
                        loginErrorMessage = null
                        coroutineScope.launch {
                            val baseUrl = normalizedServerUrl()
                            val activeOnboardingInvite = onboardingInvite
                            val activeOnboardingDeepLink = onboardingDeepLink
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    var resolvedBaseUrl = baseUrl
                                    var activatedInvite: MobileResolvedInvite? = null
                                    if (
                                        activeOnboardingInvite != null &&
                                        activeOnboardingInvite.status.equals("active", ignoreCase = true) &&
                                        activeOnboardingDeepLink != null
                                    ) {
                                        activatedInvite = api.activateTenantInvite(
                                            controlPlaneBaseUrl = activeOnboardingDeepLink.controlPlaneBaseUrl,
                                            inviteToken = activeOnboardingInvite.inviteToken,
                                            email = email,
                                            password = password,
                                            expectedTenantSlug = activeOnboardingInvite.tenantContext.tenantSlug
                                        )
                                        resolvedBaseUrl = activatedInvite.tenantContext.tenantApiUrl
                                            .trim()
                                            .ifBlank { resolvedBaseUrl }
                                    }
                                    Triple(
                                        api.login(resolvedBaseUrl, email, password),
                                        resolvedBaseUrl,
                                        activatedInvite
                                    )
                                }
                            }.onSuccess { (loginResult, resolvedBaseUrl, activatedInvite) ->
                                val canonicalApiBaseUrl = loginResult.tenantContext?.canonicalApiBaseUrl
                                    ?.trim()
                                    ?.ifBlank { null }
                                val effectiveBaseUrl = canonicalApiBaseUrl ?: resolvedBaseUrl
                                if (activatedInvite != null) {
                                    onboardingInvite = activatedInvite
                                }
                                dashboardCacheStore.clear()
                                serverUrl = effectiveBaseUrl
                                sessionStore.saveSession(effectiveBaseUrl, loginResult.accessToken)
                                session = TaskBanditSession(
                                    baseUrl = effectiveBaseUrl,
                                    token = loginResult.accessToken
                                )
                                loginErrorMessage = null
                            }.onFailure { throwable ->
                                loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            loginIsBusy = false
                        }
                    },
                    onLocalSignup = {
                        val baseUrl = normalizedServerUrl()
                        val signupRequest = MobileSignupRequest(
                            displayName = registrationDisplayName,
                            email = registrationEmail,
                            password = registrationPassword
                        )
                        loginIsBusy = true
                        loginErrorMessage = null
                        coroutineScope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) { api.signup(baseUrl, signupRequest) }
                            }.onSuccess { signupResult ->
                                val canonicalApiBaseUrl = signupResult.tenantContext?.canonicalApiBaseUrl
                                    ?.trim()
                                    ?.ifBlank { null }
                                val effectiveBaseUrl = canonicalApiBaseUrl ?: baseUrl
                                dashboardCacheStore.clear()
                                serverUrl = effectiveBaseUrl
                                sessionStore.saveSession(effectiveBaseUrl, signupResult.accessToken)
                                session = TaskBanditSession(
                                    baseUrl = effectiveBaseUrl,
                                    token = signupResult.accessToken
                                )
                                registrationDisplayName = ""
                                registrationEmail = ""
                                registrationPassword = ""
                                dashboardViewModel.setNoticeMessage(
                                    context.getString(R.string.mobile_signup_success)
                                )
                            }.onFailure { throwable ->
                                loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            loginIsBusy = false
                        }
                    },
                    onHostedSignup = {
                        val baseUrl = normalizedServerUrl()
                        val signupRequest = MobileSignupRequest(
                            displayName = registrationDisplayName,
                            email = registrationEmail,
                            password = registrationPassword
                        )
                        loginIsBusy = true
                        loginErrorMessage = null
                        coroutineScope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    val config = hostedEnrollmentConfig
                                        ?: api.getPublicEnrollmentSiteConfig(baseUrl)
                                    val enrollmentStartResult =
                                        if (config?.publicEnrollmentEnabled == true) {
                                            runCatching {
                                                api.startHostedEnrollment(
                                                    baseUrl = baseUrl,
                                                    request = signupRequest,
                                                    languageTag = if (languageTag == "system")
                                                        Locale.getDefault().toLanguageTag()
                                                    else languageTag,
                                                    siteConfig = config
                                                )
                                            }.getOrNull()
                                        } else {
                                            null
                                        }
                                    Triple(
                                        config,
                                        enrollmentStartResult,
                                        api.buildHostedSignupFallbackUrl(
                                            baseUrl = baseUrl,
                                            email = signupRequest.email,
                                            displayName = signupRequest.displayName,
                                            siteConfig = config
                                        )
                                    )
                                }
                            }.onSuccess { (config, enrollmentStartResult, fallbackUrl) ->
                                hostedEnrollmentConfig = config
                                val handoffUrl = enrollmentStartResult?.handoffUrl ?: fallbackUrl
                                if (handoffUrl.isNullOrBlank()) {
                                    loginErrorMessage =
                                        context.getString(R.string.mobile_signup_hosted_unavailable)
                                } else {
                                    runCatching {
                                        val hostedSignupIntent =
                                            Intent(Intent.ACTION_VIEW, Uri.parse(handoffUrl))
                                        context.startActivity(hostedSignupIntent)
                                    }.onSuccess {
                                        dashboardViewModel.setNoticeMessage(
                                            context.getString(R.string.mobile_signup_hosted_continue_notice)
                                        )
                                    }.onFailure { throwable ->
                                        loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
                                    }
                                }
                            }.onFailure { throwable ->
                                loginErrorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            loginIsBusy = false
                        }
                    }
                )
            } else if (
                setupWizardRedoRequested ||
                (
                    dashboardState.dashboard != null &&
                    !dashboardState.dashboard!!.onboardingCompleted &&
                    (dashboardState.dashboard!!.user.role == "admin" || dashboardState.dashboard!!.user.role == "parent")
                )
            ) {
                OnboardingWizardScreen(
                    step = setupWizardStep,
                    answers = setupWizardAnswers,
                    onAnswersChange = { setupWizardAnswers = it },
                    onNext = {
                        setupWizardStep++
                        // Save draft so the user can resume if they close the app
                        withAuth { baseUrl, token ->
                            dashboardViewModel.saveOnboardingDraft(baseUrl, token, setupWizardAnswers)
                        }
                    },
                    onBack = { if (setupWizardStep > 0) setupWizardStep-- },
                    onFinish = { finalAnswers ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.submitOnboarding(baseUrl, token, finalAnswers)
                        }
                        setupWizardRedoRequested = false
                    },
                    onSkip = {
                        val defaults = setupWizardAnswers.copy(
                            householdType = setupWizardAnswers.householdType.ifBlank { "family" },
                            homeType = setupWizardAnswers.homeType.ifBlank { "house" },
                            choreSplit = setupWizardAnswers.choreSplit.ifBlank { "shared_evenly" },
                            cookingStyle = setupWizardAnswers.cookingStyle.ifBlank { "mixed" },
                            gamificationStyle = setupWizardAnswers.gamificationStyle.ifBlank { "default" }
                        )
                        withAuth { baseUrl, token ->
                            dashboardViewModel.submitOnboarding(baseUrl, token, defaults)
                        }
                        setupWizardRedoRequested = false
                    }
                )
            } else {
                DashboardScreen(
                    dashboard = dashboardState.dashboard,
                    featureAccess = dashboardState.featureAccess,
                    hostedSubscription = dashboardState.hostedSubscription,
                    serverUrl = dashboardState.serverUrl.ifBlank { normalizedServerUrl() },
                    currentReleaseLabel = currentReleaseLabel,
                    serverReleaseLabel = serverReleaseLabel,
                    availableUpdate = visibleUpdate,
                    notificationDevices = dashboardState.notificationDevices,
                    installationId = installationId,
                    languageTag = languageTag,
                    themeMode = themeMode,
                    mobileAvatarKey = mobileAvatarKey,
                    notificationsPermissionGranted = notificationsPermissionGranted,
                    isBusy = dashboardState.isBusy,
                    showDashboardSyncNotice = dashboardState.showDashboardSyncNotice,
                    isSyncingQueue = dashboardState.isSyncingQueue,
                    activeReviewAction = dashboardState.activeReviewAction,
                    activeStartAction = dashboardState.activeStartAction,
                    activeSubmitAction = dashboardState.activeSubmitAction,
                    activeCloseCycleAction = dashboardState.activeCloseCycleAction,
                    activeCancelChoreAction = dashboardState.activeCancelChoreAction,
                    activeExternalCompleteAction = dashboardState.activeExternalCompleteAction,
                    activeDueAtAction = dashboardState.activeDueAtAction,
                    activeTakeoverRequestAction = dashboardState.activeTakeoverRequestAction,
                    activeCreateAction = dashboardState.activeCreateAction,
                    activeQuickLogAction = dashboardState.activeQuickLogAction,
                    createSuccessCounter = dashboardState.createSuccessCounter,
                    activeDeviceAction = dashboardState.activeDeviceAction,
                    errorMessage = dashboardState.errorMessage,
                    noticeMessage = dashboardState.noticeMessage,
                    pendingReconnectActionLabel = dashboardState.pendingReconnectActionLabel,
                    validationDialogMessage = dashboardState.validationDialogMessage,
                    completionCelebration = dashboardState.completionCelebration,
                    queuedSubmissionCount = dashboardState.queuedSubmissionCount,
                    onDismissValidationDialog = { dashboardViewModel.clearValidationDialog() },
                    onDismissCompletionCelebration = { dashboardViewModel.clearCompletionCelebration() },
                    onDismissUpdate = {
                        availableUpdateKey?.let { dashboardViewModel.dismissUpdateNotice(it) }
                    },
                    visibleGithubUpdate = visibleGithubUpdate,
                    githubCheckDone = dashboardState.githubCheckDone,
                    githubCheckError = dashboardState.githubCheckError,
                    githubLatestVersion = dashboardState.githubReleaseInfo?.version,
                    isDownloadingUpdate = dashboardState.isDownloadingUpdate,
                    downloadProgress = dashboardState.downloadProgress,
                    downloadError = dashboardState.downloadError,
                    onCheckForUpdates = { dashboardViewModel.checkForGithubUpdates() },
                    onDismissGithubUpdate = { dashboardViewModel.dismissGithubUpdate() },
                    onDownloadAndInstall = { info -> dashboardViewModel.downloadAndInstall(info) },
                    onRefresh = {
                        withAuth { baseUrl, token ->
                            dashboardViewModel.requestDashboardRefresh(baseUrl, token)
                        }
                    },
                    onDownloadSettingsLogs = ::downloadSettingsLogs,
                    onRedoOnboarding = ::openSetupWizardForRedo,
                    onLogout = ::logout,
                    onApprove = { instanceId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.reviewPendingChore(instanceId, true, baseUrl, token)
                        }
                    },
                    onReject = { instanceId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.reviewPendingChore(instanceId, false, baseUrl, token)
                        }
                    },
                    onToggleChecklistItem = { choreId, itemId, defaultIds ->
                        dashboardViewModel.toggleChecklistItem(choreId, itemId, defaultIds)
                    },
                    submitSelections = dashboardState.submitSelections,
                    selectedProofUris = dashboardState.selectedProofUris,
                    onPickProofs = ::openProofPicker,
                    onTakeProofPhoto = ::takeProofPhoto,
                    onStartChore = { choreId ->
                        withAuth { baseUrl, token -> dashboardViewModel.startChore(choreId, baseUrl, token) }
                    },
                    onCancelChoreOccurrence = { choreId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.cancelChoreOccurrence(choreId, baseUrl, token)
                        }
                    },
                    onCloseChoreCycle = { choreId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.closeChoreCycle(choreId, baseUrl, token)
                        }
                    },
                    onCancelChore = { choreId ->
                        withAuth { baseUrl, token -> dashboardViewModel.cancelChore(choreId, baseUrl, token) }
                    },
                    onCompleteExternalChore = { choreId, name ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.completeChoreExternally(choreId, name, baseUrl, token)
                        }
                    },
                    onEditChoreDueAt = { choreId, dueAt, title, variantId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.updateChoreDueAt(choreId, dueAt, title, variantId, baseUrl, token)
                        }
                    },
                    onTakeOverChore = { choreId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.takeOverChore(choreId, baseUrl, token)
                        }
                    },
                    onRequestTakeover = { choreId, userId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.requestTakeover(choreId, userId, baseUrl, token)
                        }
                    },
                    onRespondToTakeoverRequest = { requestId, approve ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.respondToTakeoverRequest(requestId, approve, baseUrl, token)
                        }
                    },
                    onSubmitChore = { choreId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.submitChore(choreId, baseUrl, token)
                        }
                    },
                    onCreateChore = { templateId, dueAt, assigneeId, strategy, recType, recInterval,
                                      recWeekdays, recEndMode, recOccurrences, recEndsAt, variantId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.createChore(
                                templateId, dueAt, assigneeId, strategy,
                                recType, recInterval, recWeekdays, recEndMode,
                                recOccurrences, recEndsAt, variantId, baseUrl, token
                            )
                        }
                    },
                    onQuickLog = { instanceId, templateId, title, note, createTemplate, difficulty ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.quickLog(
                                instanceId, templateId, title, note,
                                createTemplate, difficulty, baseUrl, token
                            )
                        }
                    },
                    onRemoveNotificationDevice = { deviceId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.removeNotificationDevice(deviceId, baseUrl, token)
                        }
                    },
                    onThemeModeChange = { nextMode ->
                        appPreferencesStore.saveThemeMode(nextMode)
                        themeMode = nextMode
                    },
                    onLanguageTagChange = { nextTag ->
                        appPreferencesStore.saveLanguageTag(nextTag)
                        languageTag = nextTag
                    },
                    onAvatarPresetSelect = { avatarKey ->
                        mobileAvatarKey = avatarKey
                        appPreferencesStore.saveMobileAvatarKey(avatarKey)
                    },
                    onAvatarUpload = { avatarImagePicker.launch(arrayOf("image/*")) },
                    onRequestNotificationPermission = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    },
                    onRedeemReward = { rewardId, targetDate ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.redeemReward(rewardId, baseUrl, token, targetDate)
                        }
                    },
                    onRescheduleRedemption = { redemptionId, targetDate ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.rescheduleRedemption(redemptionId, targetDate, baseUrl, token)
                        }
                    },
                    onResolveRedemption = { redemptionId, approved, note ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.resolveRedemption(redemptionId, approved, note, baseUrl, token)
                        }
                    },
                    templateManagerTemplates = dashboardState.templateManagerTemplates,
                    templateManagerLoading = dashboardState.templateManagerLoading,
                    templateManagerError = dashboardState.templateManagerError,
                    onLoadTemplatesForManager = {
                        withAuth { baseUrl, token ->
                            dashboardViewModel.loadTemplatesForManager(baseUrl, token)
                        }
                    },
                    onCreateTemplate = { input ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.createTemplate(input, baseUrl, token)
                        }
                    },
                    onUpdateTemplate = { templateId, input ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.updateTemplate(templateId, input, baseUrl, token)
                        }
                    },
                    onDeleteTemplate = { templateId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.deleteTemplate(templateId, baseUrl, token)
                        }
                    },
                    onResetTemplatesToDefaults = {
                        withAuth { baseUrl, token ->
                            dashboardViewModel.resetTemplatesToDefaults(baseUrl, token)
                        }
                    },
                    onCreateReward = { input ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.createReward(input, baseUrl, token)
                        }
                    },
                    onUpdateReward = { rewardId, input ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.updateReward(rewardId, input, baseUrl, token)
                        }
                    },
                    onDeleteReward = { rewardId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.deleteReward(rewardId, baseUrl, token)
                        }
                    },
                    onToggleReward = { rewardId ->
                        withAuth { baseUrl, token ->
                            dashboardViewModel.toggleReward(rewardId, baseUrl, token)
                        }
                    }
                )
            }
        }
    }
}

private fun buildSettingsLogReport(
    installationId: String,
    currentReleaseInfo: MobileReleaseInfo,
    serverReleaseInfo: MobileReleaseInfo?,
    serverUrl: String,
    themeMode: MobileThemeMode,
    languageTag: String,
    notificationsPermissionGranted: Boolean,
    notificationDevices: List<MobileNotificationDevice>
): String {
    val generatedAt = Instant.now().toString()
    val currentDevice = notificationDevices.firstOrNull { it.installationId == installationId }
    val lines = mutableListOf<String>()
    lines += "TaskBandit Android Settings Log Export"
    lines += "GeneratedAt=$generatedAt"
    lines += "AppRelease=${formatReleaseLabel(currentReleaseInfo)}"
    lines += "AppCommit=${BuildConfig.TASKBANDIT_COMMIT_SHA}"
    lines += "ServerRelease=${serverReleaseInfo?.let(::formatReleaseLabel) ?: "unknown"}"
    lines += "ServerUrl=$serverUrl"
    lines += "ThemeMode=${themeMode.name}"
    lines += "LanguageTag=$languageTag"
    lines += "InstallationId=$installationId"
    lines += "NotificationsPermissionGranted=$notificationsPermissionGranted"
    lines += "CurrentDeviceId=${currentDevice?.id ?: "missing"}"
    lines += "CurrentDeviceProvider=${currentDevice?.provider ?: "unknown"}"
    lines += "CurrentDevicePushTokenConfigured=${currentDevice?.pushTokenConfigured ?: false}"
    lines += "CurrentDeviceNotificationsEnabled=${currentDevice?.notificationsEnabled ?: false}"
    lines += "CurrentDeviceLastSeenAt=${currentDevice?.lastSeenAt ?: "unknown"}"
    lines += "RegisteredDeviceCount=${notificationDevices.size}"
    notificationDevices.forEachIndexed { index, device ->
        lines += "Device[$index].Id=${device.id}"
        lines += "Device[$index].InstallationId=${device.installationId}"
        lines += "Device[$index].Provider=${device.provider}"
        lines += "Device[$index].PushTokenConfigured=${device.pushTokenConfigured}"
        lines += "Device[$index].NotificationsEnabled=${device.notificationsEnabled}"
        lines += "Device[$index].LastSeenAt=${device.lastSeenAt}"
        lines += "Device[$index].AppVersion=${device.appVersion ?: "unknown"}"
        lines += "Device[$index].Locale=${device.locale ?: "unknown"}"
        lines += "Device[$index].DeviceName=${device.deviceName ?: "unknown"}"
    }
    return lines.joinToString(separator = "\n")
}

internal fun isTabletWidth(maxWidth: androidx.compose.ui.unit.Dp): Boolean = maxWidth >= 840.dp

private fun parseReleaseVersionParts(value: String): List<Int> =
    value.split('.', '-')
        .mapNotNull { it.toIntOrNull() }

internal fun compareReleaseVersions(current: String, latest: String): Int {
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

internal fun formatReleaseLabel(release: MobileReleaseInfo): String =
    "v${release.releaseVersion} (build ${release.buildNumber})"
