@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.annotation.DrawableRes
import androidx.activity.compose.BackHandler
import androidx.appcompat.app.AppCompatDelegate
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
import com.taskbandit.app.mobile.MobileChoreSubmissionDraft
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
import com.taskbandit.app.mobile.MobileReleaseInfo
import com.taskbandit.app.mobile.MobileUploadedProof
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditOutboxStore
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.BuildConfig
import com.taskbandit.app.R
import com.taskbandit.app.TemplateCreateCapabilities
import com.taskbandit.app.compareReleaseVersions
import com.taskbandit.app.formatReleaseLabel
import com.taskbandit.app.resolveTemplateCreateCapabilities
import com.taskbandit.app.viewmodels.GitHubReleaseInfo
import com.taskbandit.app.viewmodels.MobileCompletionCelebration
import com.taskbandit.app.viewmodels.MobileCompletionCelebrationVariant
import com.taskbandit.app.viewmodels.buildMobileCompletionCelebration
import com.taskbandit.app.viewmodels.createProofCaptureFile
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
import androidx.core.content.FileProvider

// ── Shared composition locals (used throughout the dashboard composable tree) ─

internal val LocalMobileFeatureAccess = compositionLocalOf {
    // Default is all-true so Composables that read this ambient outside of a
    // CompositionLocalProvider (e.g. ChoresScreen previews and standalone use)
    // are permissive. The actual deny-by-default policy lives in DashboardUiState
    // (whose initial MobileFeatureAccess() is all-false) and is pushed into this
    // ambient via the CompositionLocalProvider in DashboardScreen.
    MobileFeatureAccess(
        templatesManage = true,
        choresManage = true,
        reassignment = true,
        takeoverDirect = true,
        takeoverRequests = true,
        approvals = true,
        proofUploads = true,
        followUpAutomation = true,
        externalCompletion = true,
        deferredFollowUpControl = true,
        quickLog = true,
        rewardsManage = true,
    )
}
// ── Private types used only within DashboardScreen ───────────────────────────

private enum class MobileDashboardTab {
    CHORES,
    LEADERBOARD,
    REWARDS,
    CREATE,
    MORE,
    TEMPLATE_MANAGER,
    REWARDS_MANAGER
}

internal enum class MobileChoreSection {
    MINE,
    UNASSIGNED,
    OTHERS
}

internal enum class MobileChoreSectionTone {
    OVERDUE,
    MINE,
    UNASSIGNED,
    OTHERS,
    HISTORIC
}

internal data class MobileChoiceOption(
    val label: String,
    val selected: Boolean,
    val onClick: () -> Unit
)

private data class MobileQuickLogCandidate(
    val kind: String,
    val id: String,
    val title: String,
    val subtitle: String? = null
)

private data class MobileAvatarPreset(
    val key: String,
    @DrawableRes val drawableRes: Int
)

private val mobileAvatarPresets = listOf(
    MobileAvatarPreset("preset:mascot_avatar_01", R.drawable.mascot_avatar_01),
    MobileAvatarPreset("preset:mascot_avatar_02", R.drawable.mascot_avatar_02),
    MobileAvatarPreset("preset:mascot_avatar_03", R.drawable.mascot_avatar_03),
    MobileAvatarPreset("preset:mascot_avatar_04", R.drawable.mascot_avatar_04),
    MobileAvatarPreset("preset:mascot_avatar_05", R.drawable.mascot_avatar_05),
    MobileAvatarPreset("preset:mascot_avatar_06", R.drawable.mascot_avatar_06),
    MobileAvatarPreset("preset:mascot_avatar_07", R.drawable.mascot_avatar_07),
    MobileAvatarPreset("preset:mascot_avatar_08", R.drawable.mascot_avatar_08),
    MobileAvatarPreset("preset:mascot_avatar_09", R.drawable.mascot_avatar_09),
    MobileAvatarPreset("preset:mascot_avatar_10", R.drawable.mascot_avatar_10),
    MobileAvatarPreset("preset:mascot_avatar_11", R.drawable.mascot_avatar_11),
    MobileAvatarPreset("preset:mascot_avatar_12", R.drawable.mascot_avatar_12),
    MobileAvatarPreset("preset:mascot_avatar_13", R.drawable.mascot_avatar_13),
    MobileAvatarPreset("preset:mascot_avatar_14", R.drawable.mascot_avatar_14),
    MobileAvatarPreset("preset:mascot_avatar_15", R.drawable.mascot_avatar_15),
    MobileAvatarPreset("preset:mascot_avatar_16", R.drawable.mascot_avatar_16),
    MobileAvatarPreset("preset:mascot_avatar_17", R.drawable.mascot_avatar_17),
    MobileAvatarPreset("preset:mascot_avatar_18", R.drawable.mascot_avatar_18),
    MobileAvatarPreset("preset:mascot_avatar_19", R.drawable.mascot_avatar_19),
    MobileAvatarPreset("preset:mascot_avatar_20", R.drawable.mascot_avatar_20)
)

private val quickLogDrawableIconIds = listOf(
    "take_out_trash", "recycle_sorting", "feed_pets", "wash_dishes_sink",
    "make_bed", "change_bed_sheets", "do_laundry", "vacuum_floor",
    "water_plants", "clean_toilet", "clean_mirror_sink", "wipe_counter",
    "dishwasher", "grocery_shopping", "sort_mail"
)

internal val recurrenceWeekdayOrder = listOf(
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
)

private val historicChoreStates = setOf("completed", "approved", "rejected", "cancelled")

private fun isTabletWidth(maxWidth: Dp): Boolean = maxWidth >= 840.dp

/** Format a 'YYYY-MM-DD' date string as 'Today', 'Tomorrow', or 'Monday, 8 June'. */
internal fun formatBookingDate(dateStr: String): String {
    return try {
        val date = LocalDate.parse(dateStr)
        val today = LocalDate.now()
        when {
            date == today -> "Today"
            date == today.plusDays(1) -> "Tomorrow"
            else -> {
                val day = date.dayOfWeek.getDisplayName(TextStyle.FULL, java.util.Locale.getDefault())
                val dom = date.dayOfMonth
                val month = date.month.getDisplayName(TextStyle.FULL, java.util.Locale.getDefault())
                "$day, $dom $month"
            }
        }
    } catch (_: Exception) { dateStr }
}

@Composable
internal fun DashboardScreen(
    dashboard: MobileDashboard?,
    featureAccess: MobileFeatureAccess,
    hostedSubscription: MobileHostedSubscriptionOverview,
    serverUrl: String,
    currentReleaseLabel: String,
    serverReleaseLabel: String?,
    availableUpdate: MobileReleaseInfo?,
    notificationDevices: List<MobileNotificationDevice>,
    installationId: String,
    languageTag: String,
    themeMode: MobileThemeMode,
    mobileAvatarKey: String,
    notificationsPermissionGranted: Boolean,
    isBusy: Boolean,
    showDashboardSyncNotice: Boolean,
    isSyncingQueue: Boolean,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeCancelChoreAction: String?,
    activeExternalCompleteAction: String?,
    activeDueAtAction: String?,
    activeTakeoverRequestAction: String?,
    activeCreateAction: String?,
    activeQuickLogAction: String?,
    createSuccessCounter: Int,
    activeDeviceAction: String?,
    errorMessage: String?,
    noticeMessage: String?,
    pendingReconnectActionLabel: String?,
    validationDialogMessage: String?,
    completionCelebration: MobileCompletionCelebration?,
    queuedSubmissionCount: Int,
    onDismissValidationDialog: () -> Unit,
    onDismissCompletionCelebration: () -> Unit,
    onDismissUpdate: () -> Unit,
    visibleGithubUpdate: GitHubReleaseInfo?,
    githubCheckDone: Boolean,
    githubCheckError: Boolean,
    githubLatestVersion: String?,
    isDownloadingUpdate: Boolean,
    downloadProgress: Float,
    downloadError: Boolean,
    onCheckForUpdates: () -> Unit,
    onDismissGithubUpdate: () -> Unit,
    onDownloadAndInstall: (GitHubReleaseInfo) -> Unit,
    onRefresh: () -> Unit,
    onDownloadSettingsLogs: () -> Unit,
    onLogout: () -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onPickProofs: (String) -> Unit,
    onTakeProofPhoto: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onCancelChoreOccurrence: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onCancelChore: (String) -> Unit,
    onCompleteExternalChore: (String, String) -> Unit,
    onEditChoreDueAt: (String, String, String, String?) -> Unit,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String, String) -> Unit,
    onRespondToTakeoverRequest: (String, Boolean) -> Unit,
    onSubmitChore: (String) -> Unit,
    onCreateChore: (String, String, String?, String, String?, Int?, List<String>, String?, Int?, String?, String?) -> Unit,
    onQuickLog: (String?, String?, String?, String?, Boolean, Int?) -> Unit,
    onRemoveNotificationDevice: (String) -> Unit,
    onThemeModeChange: (MobileThemeMode) -> Unit,
    onLanguageTagChange: (String) -> Unit,
    onAvatarPresetSelect: (String) -> Unit,
    onAvatarUpload: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    onRedeemReward: (String, String?) -> Unit,
    onRescheduleRedemption: (String, String) -> Unit,
    onResolveRedemption: (String, Boolean, String?) -> Unit,
    templateManagerTemplates: List<MobileChoreTemplate>,
    templateManagerLoading: Boolean,
    templateManagerError: String?,
    onLoadTemplatesForManager: () -> Unit,
    onCreateTemplate: (CreateChoreTemplateInput) -> Unit,
    onUpdateTemplate: (String, CreateChoreTemplateInput) -> Unit,
    onDeleteTemplate: (String) -> Unit,
    onResetTemplatesToDefaults: () -> Unit,
    onCreateReward: (CreateRewardInput) -> Unit,
    onUpdateReward: (String, UpdateRewardInput) -> Unit,
    onDeleteReward: (String) -> Unit,
    onToggleReward: (String) -> Unit
) {
    val context = LocalContext.current
    val isCreatorRole = dashboard?.user?.role == "admin" || dashboard?.user?.role == "parent"
    val templateCreateCapabilities = resolveTemplateCreateCapabilities(featureAccess)
    val canManageChores = templateCreateCapabilities.canOpenCreateTab
    val canManageTemplates = templateCreateCapabilities.canEditTemplates
    val canUseReassignment = featureAccess.reassignment
    val canUseTakeoverRequestsFeature = featureAccess.takeoverRequests
    val canUseQuickLog = isCreatorRole && featureAccess.quickLog
    val canUseRewards = featureAccess.rewardsManage
    val currentUserId = dashboard?.user?.id
    val currentUserRole = dashboard?.user?.role
    var activeTab by rememberSaveable { mutableStateOf(MobileDashboardTab.CHORES) }
    val tabHistory = remember { mutableStateListOf<MobileDashboardTab>() }
    var selectedTemplateId by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedTemplateGroupTitle by rememberSaveable { mutableStateOf<String?>(null) }
    var createDueAtMillis by rememberSaveable { mutableStateOf(defaultCreateDueAtMillis()) }
    var createAssignmentStrategy by rememberSaveable { mutableStateOf("round_robin") }
    var createAssigneeId by rememberSaveable { mutableStateOf<String?>(null) }
    var createRecurrenceType by rememberSaveable { mutableStateOf("template") }
    var createRecurrenceIntervalInput by rememberSaveable { mutableStateOf("7") }
    var createRecurrenceWeekdays by rememberSaveable { mutableStateOf(listOf<String>()) }
    var createRecurrenceEndMode by rememberSaveable { mutableStateOf("never") }
    var createRecurrenceOccurrencesInput by rememberSaveable { mutableStateOf("3") }
    var createRecurrenceEndsAtMillis by rememberSaveable { mutableLongStateOf(defaultCreateRecurrenceEndsAtMillis()) }
    var expandedChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var expandedHistoricChoreIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var templateGroupDropdownExpanded by remember { mutableStateOf(false) }
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
    var showQuickLogDialog by rememberSaveable { mutableStateOf(false) }
    var showSpeedDial by rememberSaveable { mutableStateOf(false) }
    var showProfileDialog by rememberSaveable { mutableStateOf(false) }
    var activeNewUiChoreDialogId by rememberSaveable { mutableStateOf<String?>(null) }
    var showCompletedChoresSection by rememberSaveable { mutableStateOf(false) }
    var showMoreSheet by rememberSaveable { mutableStateOf(false) }
    val dashboardListState = rememberLazyListState()
    var shouldScrollToUpdate by remember { mutableStateOf(false) }
    var rewardsShopTab by rememberSaveable { mutableStateOf("shop") }
    var redeemConfirmRewardId by rememberSaveable { mutableStateOf<String?>(null) }
    var redeemTargetDate by rememberSaveable { mutableStateOf("") }
    var rescheduleRedemptionId by rememberSaveable { mutableStateOf<String?>(null) }
    var rescheduleTargetDate by rememberSaveable { mutableStateOf("") }
    var rejectRedemptionId by rememberSaveable { mutableStateOf<String?>(null) }
    var rejectRedemptionNote by rememberSaveable { mutableStateOf("") }
    var quickLogQuery by rememberSaveable { mutableStateOf("") }
    var quickLogNote by rememberSaveable { mutableStateOf("") }
    var quickLogSelectedKind by rememberSaveable { mutableStateOf<String?>(null) }
    var quickLogSelectedId by rememberSaveable { mutableStateOf<String?>(null) }
    var quickLogIcon by rememberSaveable { mutableStateOf<String?>(null) }
    var quickLogCreateTemplate by rememberSaveable { mutableStateOf(false) }
    var quickLogUsePointsOverride by rememberSaveable { mutableStateOf(false) }
    var quickLogPointsOverrideInput by rememberSaveable { mutableStateOf("") }
    val selectedAvatarPreset = remember(mobileAvatarKey) {
        mobileAvatarPresets.firstOrNull { it.key == mobileAvatarKey }
    }
    val selectedAvatarUploadUri = remember(mobileAvatarKey) {
        mobileAvatarKey.removePrefix("upload:").takeIf { mobileAvatarKey.startsWith("upload:") }
    }
    val selectedAvatarUploadImageBitmap = remember(selectedAvatarUploadUri) {
        loadImageBitmapFromUri(context, selectedAvatarUploadUri)
    }
    val currentDevice = notificationDevices.firstOrNull { it.installationId == installationId }
    fun openTab(tab: MobileDashboardTab) {
        if (activeTab != tab) {
            tabHistory.add(activeTab)
            activeTab = tab
        }
    }
    // If rewards feature gets disabled mid-session, bounce back to chores
    LaunchedEffect(canUseRewards) {
        if (!canUseRewards && (activeTab == MobileDashboardTab.REWARDS || activeTab == MobileDashboardTab.REWARDS_MANAGER)) {
            activeTab = MobileDashboardTab.CHORES
        }
    }
    fun backWithinDashboard(): Boolean {
        if (showProfileDialog) {
            showProfileDialog = false
            return true
        }
        if (showQuickLogDialog) {
            showQuickLogDialog = false
            return true
        }
        if (activeNewUiChoreDialogId != null) {
            activeNewUiChoreDialogId = null
            return true
        }
        if (activeTab != MobileDashboardTab.CHORES) {
            val previousTab = tabHistory.lastOrNull()
            if (previousTab != null) {
                tabHistory.removeAt(tabHistory.lastIndex)
                activeTab = previousTab
            } else {
                activeTab = MobileDashboardTab.CHORES
            }
            return true
        }
        return false
    }
    val templates = dashboard?.templates.orEmpty()
    val templateVariantsByTemplateId =
        remember(templates) { templates.associate { template -> template.id to template.variants } }
    val templateGroups = remember(templates) {
        templates.map { it.groupTitle }.distinct().sorted()
    }
    val visibleTemplateGroupTitle = remember(templateGroups, templates, selectedTemplateId, selectedTemplateGroupTitle) {
        selectedTemplateGroupTitle
            ?: templates.firstOrNull { it.id == selectedTemplateId }?.groupTitle
            ?: templateGroups.firstOrNull()
    }
    val visibleTemplates = remember(templates, visibleTemplateGroupTitle) {
        if (visibleTemplateGroupTitle.isNullOrBlank()) {
            templates
        } else {
            templates.filter { it.groupTitle == visibleTemplateGroupTitle }
        }
    }
    val members = dashboard?.members.orEmpty()
    val leaderboardEntries = dashboard?.leaderboard.orEmpty()
    val allRewards = dashboard?.rewards.orEmpty()
    val enabledRewards = remember(allRewards, currentUserRole) {
        allRewards.filter { reward ->
            if (!reward.isEnabled) return@filter false
            if (currentUserRole == "child") {
                reward.eligibility == "CHILD_ONLY" || reward.eligibility == "ALL"
            } else {
                reward.eligibility == "ADULT_ONLY" || reward.eligibility == "ALL"
            }
        }
    }
    val allRedemptions = dashboard?.redemptions.orEmpty()
    val pendingRedemptions = remember(allRedemptions) { allRedemptions.filter { it.status == "PENDING" } }
    val myRedemptions = remember(allRedemptions, currentUserId) {
        allRedemptions.filter { it.requestedById == currentUserId }
    }
    val isParentOrAdmin = currentUserRole != null && currentUserRole != "child"
    val currentUserPoints = dashboard?.user?.points ?: 0
    val pendingTakeoverRequests = dashboard?.takeoverRequests.orEmpty()
    val supportsTakeoverRequests = dashboard?.compatibility?.takeoverRequestsSupported ?: true
    val canUseTakeoverRequests = supportsTakeoverRequests && canUseTakeoverRequestsFeature
    val incomingTakeoverRequests = remember(pendingTakeoverRequests, currentUserId, canUseTakeoverRequests) {
        if (!canUseTakeoverRequests) {
            emptyList()
        } else {
            pendingTakeoverRequests.filter { it.status == "PENDING" && it.requested.id == currentUserId }
        }
    }
    val outgoingTakeoverRequestsByChoreId = remember(pendingTakeoverRequests, currentUserId, canUseTakeoverRequests) {
        if (!canUseTakeoverRequests) {
            emptyMap()
        } else {
            pendingTakeoverRequests
                .filter { it.status == "PENDING" && it.requester.id == currentUserId }
                .associateBy { it.choreId }
        }
    }
    val selectedTemplate = remember(visibleTemplates, templates, selectedTemplateId) {
        visibleTemplates.firstOrNull { it.id == selectedTemplateId }
            ?: templates.firstOrNull { it.id == selectedTemplateId }
            ?: visibleTemplates.firstOrNull()
            ?: templates.firstOrNull()
    }
    val eligibleTakeoverMembers = remember(members, currentUserId) {
        members.filter { it.id != currentUserId }
    }
    val assignableMembers = remember(members, canUseReassignment) {
        if (canUseReassignment) members else emptyList()
    }
    val sortedChores = remember(dashboard?.chores, currentUserId) {
        dashboard?.chores.orEmpty()
            .filter { it.state !in historicChoreStates }
            .sortedWith(compareBy({ choreSectionRank(resolveChoreSection(it, currentUserId)) }, { parseInstantForSort(it.dueAt) }, { it.title.lowercase(Locale.getDefault()) }))
    }
    val historicChores = remember(dashboard?.chores) {
        dashboard?.chores.orEmpty()
            .filter { it.state in historicChoreStates }
            .sortedByDescending { parseInstantForSort(it.dueAt) }
    }
    val myChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.MINE } }
    val myChoresOverdue = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.OVERDUE }
    }
    val myChoresDueToday = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.TODAY }
    }
    val myChoresDueThisWeek = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.THIS_WEEK }
    }
    val myChoresDueLater = remember(myChores, languageTag) {
        myChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.LATER }
    }
    val choresOverdue = remember(sortedChores, languageTag) {
        sortedChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.OVERDUE }
    }
    val choresDueToday = remember(sortedChores, languageTag) {
        sortedChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.TODAY }
    }
    val choresDueThisWeek = remember(sortedChores, languageTag) {
        sortedChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.THIS_WEEK }
    }
    val choresDueLater = remember(sortedChores, languageTag) {
        sortedChores.filter { resolveMyChoreDueBucket(it) == MobileMyChoreDueBucket.LATER }
    }
    val unassignedChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.UNASSIGNED } }
    val otherChores = remember(sortedChores, currentUserId) { sortedChores.filter { resolveChoreSection(it, currentUserId) == MobileChoreSection.OTHERS } }
    val quickLogCandidates = remember(sortedChores, templates) {
        buildList {
            sortedChores.forEach { chore ->
                add(
                    MobileQuickLogCandidate(
                        kind = "instance",
                        id = chore.id,
                        title = chore.title,
                        subtitle = chore.groupTitle
                    )
                )
            }
            templates.forEach { template ->
                add(
                    MobileQuickLogCandidate(
                        kind = "template",
                        id = template.id,
                        title = template.title,
                        subtitle = template.groupTitle
                    )
                )
            }
        }
    }
    val filteredQuickLogCandidates = remember(quickLogCandidates, quickLogQuery) {
        val normalized = quickLogQuery.trim().lowercase(Locale.getDefault())
        if (normalized.isBlank()) {
            quickLogCandidates.take(8)
        } else {
            quickLogCandidates.filter { candidate ->
                candidate.title.lowercase(Locale.getDefault()).contains(normalized) ||
                    (candidate.subtitle?.lowercase(Locale.getDefault())?.contains(normalized) == true)
            }.take(8)
        }
    }
    val selectedQuickLogCandidate = remember(quickLogCandidates, quickLogSelectedKind, quickLogSelectedId) {
        quickLogCandidates.firstOrNull { candidate ->
            candidate.kind == quickLogSelectedKind && candidate.id == quickLogSelectedId
        }
    }
    val quickLogDefaultPoints = dashboard?.quickLogPointsDefault ?: 0
    val choresOverdueLabel = stringResource(R.string.mobile_chores_overdue)
    val overdueHeaderColor = MaterialTheme.colorScheme.error
    val choresDueTodayLabel = stringResource(R.string.mobile_chores_due_today)
    val choresDueThisWeekLabel = stringResource(R.string.mobile_chores_due_this_week)
    val choresDueLaterLabel = stringResource(R.string.mobile_chores_due_later)
    val choresUnassignedLabel = stringResource(R.string.mobile_chores_unassigned)
    val choresOthersLabel = stringResource(R.string.mobile_chores_others)
    val choresHistoryLabel = stringResource(R.string.mobile_chores_history)
    val completedChoresLabel = stringResource(R.string.mobile_completed_chores)
    val showCompletedLabel = stringResource(R.string.mobile_show_completed_chores)
    val hideCompletedLabel = stringResource(R.string.mobile_hide_completed_chores)
    val noChoresLabel = stringResource(R.string.mobile_no_chores)
    val actionRequiredTitle = stringResource(R.string.mobile_action_required_title)
    val recurrenceIntervalInvalidMessage = stringResource(R.string.mobile_create_interval_days_invalid)
    val recurrenceWeekdaysInvalidMessage = stringResource(R.string.mobile_create_weekdays_required)
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
    val createRecurrenceWeekdaysError =
        if (effectiveCreateRecurrenceType == "custom_weekly" && createRecurrenceWeekdays.isEmpty()) {
            recurrenceWeekdaysInvalidMessage
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
    val hasSyncFailureContext =
        !pendingReconnectActionLabel.isNullOrBlank() || queuedSubmissionCount > 0
    val showStatusCard =
        !pendingReconnectActionLabel.isNullOrBlank() ||
            queuedSubmissionCount > 0 ||
            isSyncingQueue ||
            !noticeMessage.isNullOrBlank() ||
            !errorMessage.isNullOrBlank()

    LaunchedEffect(templateGroups, visibleTemplates, selectedTemplateId) {
        if (!visibleTemplateGroupTitle.isNullOrBlank() && selectedTemplateGroupTitle != visibleTemplateGroupTitle) {
            selectedTemplateGroupTitle = visibleTemplateGroupTitle
        }

        if (visibleTemplates.isNotEmpty() && visibleTemplates.none { it.id == selectedTemplateId }) {
            selectedTemplateId = visibleTemplates.first().id
        }
    }

    LaunchedEffect(selectedTemplate?.id) {
        val template = selectedTemplate ?: return@LaunchedEffect
        createAssignmentStrategy = template.assignmentStrategy
        val (defaultType, defaultInterval) = templateRecurrenceDefaults(template.recurrence)
        createRecurrenceType = defaultType
        createRecurrenceIntervalInput = defaultInterval.toString()
        createRecurrenceWeekdays = templateRecurrenceWeekdayDefaults(template.recurrence)
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
            createRecurrenceWeekdays = templateRecurrenceWeekdayDefaults(template.recurrence)
        } else {
            createAssignmentStrategy = "round_robin"
            createRecurrenceType = "template"
            createRecurrenceIntervalInput = "7"
            createRecurrenceWeekdays = emptyList()
        }
        createRecurrenceEndMode = "never"
        createRecurrenceOccurrencesInput = "3"
        createRecurrenceEndsAtMillis = defaultCreateRecurrenceEndsAtMillis(createDueAtMillis)
        createAssigneeId = null
        createVariantId = null
        templateGroupDropdownExpanded = false
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

    val redeemConfirmReward = allRewards.firstOrNull { it.id == redeemConfirmRewardId }
    if (redeemConfirmReward != null) {
        val isExclusive = redeemConfirmReward.workflowType == "DAILY_EXCLUSIVE"
        val conflictingClaim = if (isExclusive && redeemTargetDate.isNotBlank())
            redeemConfirmReward.upcomingClaims.firstOrNull {
                it.targetDate == redeemTargetDate && it.userId != dashboard?.user?.id
            } else null
        val rewardDatePicker = remember(context, redeemTargetDate) {
            val initial = if (redeemTargetDate.isNotBlank())
                runCatching { LocalDate.parse(redeemTargetDate) }.getOrDefault(LocalDate.now())
            else LocalDate.now()
            DatePickerDialog(
                context,
                { _, year, month, day ->
                    redeemTargetDate = "%04d-%02d-%02d".format(year, month + 1, day)
                },
                initial.year, initial.monthValue - 1, initial.dayOfMonth
            ).apply {
                datePicker.minDate = System.currentTimeMillis() - 1000
                datePicker.maxDate = System.currentTimeMillis() + 14 * 86_400_000L
            }
        }
        AlertDialog(
            onDismissRequest = {
                redeemConfirmRewardId = null
                redeemTargetDate = ""
            },
            title = { Text(stringResource(R.string.mobile_rewards_confirm_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(redeemConfirmReward.title, style = MaterialTheme.typography.titleSmall)
                    if (isExclusive) {
                        OutlinedButton(
                            onClick = { rewardDatePicker.show() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                if (redeemTargetDate.isBlank())
                                    stringResource(R.string.mobile_rewards_confirm_choose_date)
                                else
                                    formatBookingDate(redeemTargetDate)
                            )
                        }
                        if (conflictingClaim != null) {
                            Text(
                                text = stringResource(R.string.mobile_rewards_exclusive_date_taken, conflictingClaim.displayName),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    Text(stringResource(R.string.mobile_rewards_confirm_cost, redeemConfirmReward.pointCost))
                    Text(stringResource(R.string.mobile_rewards_confirm_balance_after, currentUserPoints - redeemConfirmReward.pointCost))
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val id = redeemConfirmReward.id
                        val date = if (isExclusive) redeemTargetDate.ifBlank { null } else null
                        redeemConfirmRewardId = null
                        redeemTargetDate = ""
                        onRedeemReward(id, date)
                    },
                    enabled = !isExclusive || (redeemTargetDate.isNotBlank() && conflictingClaim == null)
                ) {
                    Text(stringResource(R.string.mobile_rewards_redeem))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = {
                    redeemConfirmRewardId = null
                    redeemTargetDate = ""
                }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
        )
    }

    // Reschedule booking dialog
    val rescheduleRedemption = allRedemptions.firstOrNull { it.id == rescheduleRedemptionId }
    if (rescheduleRedemption != null) {
        val rescheduleReward = allRewards.firstOrNull { it.id == rescheduleRedemption.rewardId }
        val rescheduleConflict = if (rescheduleTargetDate.isNotBlank())
            rescheduleReward?.upcomingClaims?.firstOrNull {
                it.targetDate == rescheduleTargetDate &&
                it.userId != dashboard?.user?.id &&
                it.redemptionId != rescheduleRedemptionId
            } else null
        val rescheduleDatePicker = remember(context, rescheduleTargetDate) {
            val initial = if (rescheduleTargetDate.isNotBlank())
                runCatching { LocalDate.parse(rescheduleTargetDate) }.getOrDefault(LocalDate.now())
            else LocalDate.now()
            DatePickerDialog(
                context,
                { _, year, month, day ->
                    rescheduleTargetDate = "%04d-%02d-%02d".format(year, month + 1, day)
                },
                initial.year, initial.monthValue - 1, initial.dayOfMonth
            ).apply {
                datePicker.minDate = System.currentTimeMillis() - 1000
                datePicker.maxDate = System.currentTimeMillis() + 14 * 86_400_000L
            }
        }
        AlertDialog(
            onDismissRequest = {
                rescheduleRedemptionId = null
                rescheduleTargetDate = ""
            },
            title = { Text(stringResource(R.string.mobile_rewards_reschedule_dialog_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(rescheduleRedemption.rewardTitle, style = MaterialTheme.typography.titleSmall)
                    OutlinedButton(
                        onClick = { rescheduleDatePicker.show() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            if (rescheduleTargetDate.isBlank())
                                stringResource(R.string.mobile_rewards_reschedule_dialog_new_date)
                            else
                                formatBookingDate(rescheduleTargetDate)
                        )
                    }
                    if (rescheduleConflict != null) {
                        Text(
                            text = stringResource(R.string.mobile_rewards_exclusive_date_taken, rescheduleConflict.displayName),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val id = rescheduleRedemptionId ?: return@Button
                        val date = rescheduleTargetDate
                        rescheduleRedemptionId = null
                        rescheduleTargetDate = ""
                        onRescheduleRedemption(id, date)
                    },
                    enabled = rescheduleTargetDate.isNotBlank() && rescheduleConflict == null
                ) {
                    Text(stringResource(R.string.mobile_rewards_reschedule_dialog_confirm))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = {
                    rescheduleRedemptionId = null
                    rescheduleTargetDate = ""
                }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
        )
    }

    if (rejectRedemptionId != null) {
        AlertDialog(
            onDismissRequest = { rejectRedemptionId = null },
            title = { Text(stringResource(R.string.mobile_rewards_reject_title)) },
            text = {
                OutlinedTextField(
                    value = rejectRedemptionNote,
                    onValueChange = { rejectRedemptionNote = it },
                    label = { Text(stringResource(R.string.mobile_rewards_reject_note)) },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val id = rejectRedemptionId!!
                        val note = rejectRedemptionNote.ifBlank { null }
                        rejectRedemptionId = null
                        rejectRedemptionNote = ""
                        onResolveRedemption(id, false, note)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text(stringResource(R.string.mobile_rewards_reject)) }
            },
            dismissButton = {
                OutlinedButton(onClick = { rejectRedemptionId = null }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
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

    fun resetQuickLogForm() {
        showQuickLogDialog = false
        quickLogQuery = ""
        quickLogNote = ""
        quickLogSelectedKind = null
        quickLogSelectedId = null
        quickLogIcon = null
        quickLogCreateTemplate = false
        quickLogUsePointsOverride = false
        quickLogPointsOverrideInput = ""
    }

    if (showQuickLogDialog && canUseQuickLog) {
        val parsedOverridePoints = quickLogPointsOverrideInput.trim().toIntOrNull()
        val quickLogCanSubmit =
            activeQuickLogAction == null &&
                (
                    !quickLogSelectedId.isNullOrBlank() ||
                        quickLogQuery.trim().isNotBlank()
                    ) &&
                (!quickLogUsePointsOverride || (parsedOverridePoints != null && parsedOverridePoints >= 0))
        val previewInstanceCandidate =
            selectedQuickLogCandidate?.takeIf { it.kind == "instance" }
                ?: filteredQuickLogCandidates.firstOrNull { it.kind == "instance" }
        val previewTemplateCandidate =
            selectedQuickLogCandidate?.takeIf { it.kind == "template" }
                ?: filteredQuickLogCandidates.firstOrNull { it.kind == "template" }
        val submitQuickLog = {
            val selectedKind = quickLogSelectedKind
            val selectedId = quickLogSelectedId
            val typedTitle = quickLogQuery.trim()
            val fallbackTitle = selectedQuickLogCandidate?.title?.trim().orEmpty()
            val titleSource = typedTitle.ifBlank { fallbackTitle }
            val decoratedTitle = applyChoreIconTokenToTitle(titleSource, quickLogIcon)
            val pointsOverride =
                if (quickLogUsePointsOverride) quickLogPointsOverrideInput.trim().toIntOrNull() else null
            onQuickLog(
                selectedId.takeIf { selectedKind == "instance" },
                selectedId.takeIf { selectedKind == "template" },
                decoratedTitle.takeIf { selectedKind != "instance" && it.isNotBlank() },
                quickLogNote.trim().ifBlank { null },
                quickLogCreateTemplate && selectedKind != "instance",
                pointsOverride
            )
            resetQuickLogForm()
        }

        Dialog(
            onDismissRequest = ::resetQuickLogForm,
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.78f)
                    .widthIn(max = 560.dp)
                    .heightIn(max = 820.dp),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp,
                shadowElevation = 20.dp,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.18f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(26.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = stringResource(R.string.mobile_quick_log_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    OutlinedTextField(
                        value = quickLogQuery,
                        onValueChange = {
                            quickLogQuery = it
                            quickLogSelectedKind = null
                            quickLogSelectedId = null
                        },
                        label = { Text(stringResource(R.string.mobile_quick_log_label)) },
                        trailingIcon = {
                            if (quickLogQuery.isNotBlank()) {
                                TextButton(onClick = {
                                    quickLogQuery = ""
                                    quickLogSelectedKind = null
                                    quickLogSelectedId = null
                                }) {
                                    Text("X")
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { quickLogIcon = null },
                            modifier = Modifier.size(52.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(
                                if (quickLogIcon == null) 2.dp else 1.dp,
                                if (quickLogIcon == null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.32f)
                            ),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("—", style = MaterialTheme.typography.titleMedium)
                        }
                        quickLogDrawableIconIds.forEach { iconId ->
                            val drawable = resolveChoreIconDrawableFromToken(iconId)
                            OutlinedButton(
                                onClick = { quickLogIcon = iconId },
                                modifier = Modifier.size(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(
                                    if (quickLogIcon == iconId) 2.dp else 1.dp,
                                    if (quickLogIcon == iconId) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.32f)
                                ),
                                contentPadding = PaddingValues(4.dp)
                            ) {
                                if (drawable != null) {
                                    Image(
                                        painter = painterResource(drawable),
                                        contentDescription = null,
                                        contentScale = ContentScale.Fit,
                                        modifier = Modifier.size(36.dp)
                                    )
                                }
                            }
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        previewInstanceCandidate?.let { candidate ->
                            QuickLogMatchChip(
                                icon = quickLogIcon,
                                label = stringResource(R.string.mobile_quick_log_match_open, candidate.subtitle ?: ""),
                                title = candidate.title,
                                selected = quickLogSelectedKind == candidate.kind && quickLogSelectedId == candidate.id,
                                onClick = {
                                    quickLogSelectedKind = candidate.kind
                                    quickLogSelectedId = candidate.id
                                    quickLogQuery = candidate.title
                                    quickLogIcon = resolveChoreIconIdFromTitle(candidate.title, candidate.subtitle)
                                    quickLogCreateTemplate = false
                                }
                            )
                        }
                        previewTemplateCandidate?.let { candidate ->
                            QuickLogMatchChip(
                                icon = quickLogIcon,
                                label = stringResource(R.string.mobile_quick_log_match_template, candidate.subtitle ?: ""),
                                title = candidate.title,
                                selected = quickLogSelectedKind == candidate.kind && quickLogSelectedId == candidate.id,
                                onClick = {
                                    quickLogSelectedKind = candidate.kind
                                    quickLogSelectedId = candidate.id
                                    quickLogQuery = candidate.title
                                    quickLogIcon = resolveChoreIconIdFromTitle(candidate.title, candidate.subtitle)
                                }
                            )
                        }
                    }
                    OutlinedTextField(
                        value = quickLogNote,
                        onValueChange = { quickLogNote = it },
                        label = { Text(stringResource(R.string.mobile_quick_log_note_label)) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 1,
                        maxLines = 2
                    )
                    if (selectedQuickLogCandidate?.kind == "template" || quickLogSelectedId == null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Checkbox(
                                checked = quickLogCreateTemplate,
                                onCheckedChange = { quickLogCreateTemplate = it }
                            )
                            Text(
                                text = stringResource(R.string.mobile_quick_log_create_template),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Checkbox(
                            checked = quickLogUsePointsOverride,
                            onCheckedChange = { quickLogUsePointsOverride = it }
                        )
                        Text(
                            text = stringResource(R.string.mobile_quick_log_override_points),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = quickLogPointsOverrideInput.ifBlank { quickLogDefaultPoints.toString() },
                            onValueChange = { value ->
                                if (value.all(Char::isDigit)) {
                                    quickLogPointsOverrideInput = value
                                }
                            },
                            enabled = quickLogUsePointsOverride,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                            modifier = Modifier.widthIn(min = 86.dp, max = 96.dp),
                            singleLine = true
                        )
                    }
                    Text(
                        text = stringResource(R.string.mobile_quick_log_default_points_hint, quickLogDefaultPoints),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = ::resetQuickLogForm) {
                            Text(stringResource(R.string.mobile_request_takeover_cancel))
                        }
                        Spacer(modifier = Modifier.size(12.dp))
                        Button(
                            onClick = { submitQuickLog() },
                            enabled = quickLogCanSubmit,
                            shape = RoundedCornerShape(14.dp),
                            contentPadding = PaddingValues(horizontal = 22.dp, vertical = 14.dp)
                        ) {
                            Text(
                                stringResource(
                                    if (activeQuickLogAction == "quick-log") {
                                        R.string.mobile_quick_log_saving
                                    } else {
                                        R.string.mobile_quick_log_submit
                                    }
                                )
                            )
                        }
                    }
                }
            }
        }
    }

    if (showProfileDialog && dashboard != null) {
        Dialog(
            onDismissRequest = { showProfileDialog = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.82f)
                    .widthIn(max = 480.dp),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 6.dp,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Profile",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                    Surface(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .size(92.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        when {
                            selectedAvatarUploadImageBitmap != null -> {
                                Image(
                                    bitmap = selectedAvatarUploadImageBitmap,
                                    contentDescription = dashboard.user.displayName,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            selectedAvatarPreset != null -> {
                                Image(
                                    painter = painterResource(selectedAvatarPreset.drawableRes),
                                    contentDescription = dashboard.user.displayName,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            else -> {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = initialsFromDisplayName(dashboard.user.displayName),
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }
                    }
                    SettingsValueLine(label = "Name", value = dashboard.user.displayName)
                    SettingsValueLine(label = "Role", value = formatLeaderboardRoleLabel(dashboard.user.role))
                    SettingsValueLine(label = "Points", value = dashboard.user.points.toString())
                    SettingsValueLine(label = "Streak", value = dashboard.user.currentStreak.toString())
                    Text(
                        text = "Choose avatar",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        mobileAvatarPresets.forEach { preset ->
                            val selected = preset.key == selectedAvatarPreset?.key
                            OutlinedButton(
                                onClick = { onAvatarPresetSelect(preset.key) },
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(0.dp),
                                border = BorderStroke(
                                    if (selected) 2.dp else 1.dp,
                                    if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.24f)
                                ),
                                modifier = Modifier.size(58.dp)
                            ) {
                                Image(
                                    painter = painterResource(preset.drawableRes),
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                    OutlinedButton(onClick = onAvatarUpload, modifier = Modifier.fillMaxWidth()) {
                        Text("Upload photo")
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { showProfileDialog = false }) {
                            Text(stringResource(R.string.mobile_request_takeover_cancel))
                        }
                        Spacer(modifier = Modifier.size(8.dp))
                        Button(onClick = { showProfileDialog = false }) {
                            Text("Save")
                        }
                    }
                }
            }
        }
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

    if (completionCelebration != null) {
        CompletionCelebrationDialog(
            celebration = completionCelebration,
            onDismiss = onDismissCompletionCelebration
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

    if (requestTakeoverChore != null && canUseTakeoverRequests) {
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

    val activeNewUiChoreDialog = remember(sortedChores, activeNewUiChoreDialogId) {
        sortedChores.firstOrNull { it.id == activeNewUiChoreDialogId }
    }
    if (activeNewUiChoreDialog != null) {
        ModalBottomSheet(
            onDismissRequest = { activeNewUiChoreDialogId = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            ChoreActionSheet(
                chore = activeNewUiChoreDialog,
                currentUserId = currentUserId,
                currentUserRole = currentUserRole,
                supportsTakeoverRequests = canUseTakeoverRequests,
                outgoingTakeoverRequest = outgoingTakeoverRequestsByChoreId[activeNewUiChoreDialog.id],
                activeReviewAction = activeReviewAction,
                activeStartAction = activeStartAction,
                activeSubmitAction = activeSubmitAction,
                activeCloseCycleAction = activeCloseCycleAction,
                activeCancelChoreAction = activeCancelChoreAction,
                activeTakeoverRequestAction = activeTakeoverRequestAction,
                activeDueAtAction = activeDueAtAction,
                activeExternalCompleteAction = activeExternalCompleteAction,
                selectedChecklistIds = submitSelections[activeNewUiChoreDialog.id]
                    ?: activeNewUiChoreDialog.completedChecklistIds.toSet(),
                selectedProofCount = selectedProofUris[activeNewUiChoreDialog.id]?.size ?: 0,
                editableVariants = activeNewUiChoreDialog.templateId
                    ?.let { templateVariantsByTemplateId[it] }.orEmpty(),
                onDismiss = { activeNewUiChoreDialogId = null },
                onApprove = { choreId -> activeNewUiChoreDialogId = null; onApprove(choreId) },
                onReject = { choreId -> activeNewUiChoreDialogId = null; onReject(choreId) },
                onClaimChore = { choreId -> activeNewUiChoreDialogId = null; startConfirmationChoreId = choreId },
                onTakeOverChore = { choreId -> activeNewUiChoreDialogId = null; takeoverConfirmationChoreId = choreId },
                onRequestTakeover = { choreId ->
                    activeNewUiChoreDialogId = null
                    requestTakeoverChoreId = choreId
                    requestTakeoverMemberId = null
                },
                onSubmitChore = { choreId -> activeNewUiChoreDialogId = null; submitConfirmationChoreId = choreId },
                onEditChoreDueAt = { a, b, c, d -> activeNewUiChoreDialogId = null; onEditChoreDueAt(a, b, c, d) },
                onCancelChoreOccurrence = { choreId -> activeNewUiChoreDialogId = null; onCancelChoreOccurrence(choreId) },
                onCloseChoreCycle = { choreId -> activeNewUiChoreDialogId = null; onCloseChoreCycle(choreId) },
                onCancelChore = { choreId -> activeNewUiChoreDialogId = null; onCancelChore(choreId) },
                onCompleteExternalChore = { choreId, name -> activeNewUiChoreDialogId = null; onCompleteExternalChore(choreId, name) }
            )
        }
    }

    if (showMoreSheet) {
        ModalBottomSheet(
            onDismissRequest = { showMoreSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            MoreMenuSheet(
                isCreatorRole = isCreatorRole,
                canManageTemplates = canManageTemplates,
                onNavigateSettings = {
                    showMoreSheet = false
                    openTab(MobileDashboardTab.MORE)
                },
                onNavigateTemplates = {
                    showMoreSheet = false
                    openTab(MobileDashboardTab.TEMPLATE_MANAGER)
                },
            )
        }
    }

    // Scroll to the GitHub update card when the banner is tapped on the home screen.
    // Items: 0=intro 1=appearance 2=device [3=plan (hosted+creator only)] 3/4=release 4/5=github-update (when visible) …
    LaunchedEffect(activeTab, shouldScrollToUpdate) {
        if (shouldScrollToUpdate && activeTab == MobileDashboardTab.MORE) {
            val releaseItemIndex = if (hostedSubscription.hostedMode && isCreatorRole) 4 else 3
            val targetIndex = if (visibleGithubUpdate != null) releaseItemIndex + 1 else releaseItemIndex
            dashboardListState.animateScrollToItem(targetIndex)
            shouldScrollToUpdate = false
        }
    }

    BackHandler(
        enabled = showMoreSheet || showSpeedDial || showProfileDialog || showQuickLogDialog || activeNewUiChoreDialogId != null || activeTab != MobileDashboardTab.CHORES
    ) {
        if (showMoreSheet) { showMoreSheet = false }
        else if (showSpeedDial) { showSpeedDial = false }
        else backWithinDashboard()
    }

    CompositionLocalProvider(
        LocalMobileFeatureAccess provides featureAccess
    ) {
        Scaffold(
        topBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.background
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(0.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(
                            painter = painterResource(R.drawable.taskbandit_logo),
                            contentDescription = stringResource(R.string.brand_mark_description),
                            modifier = Modifier
                                .widthIn(max = 186.dp)
                                .heightIn(max = 48.dp)
                        )
                    }
                    Surface(
                        modifier = Modifier.size(46.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.14f))
                    ) {
                        IconButton(onClick = { showProfileDialog = true }) {
                            when {
                                selectedAvatarUploadImageBitmap != null -> {
                                    Image(
                                        bitmap = selectedAvatarUploadImageBitmap,
                                        contentDescription = dashboard?.user?.displayName,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }

                                selectedAvatarPreset != null -> {
                                    Image(
                                        painter = painterResource(selectedAvatarPreset.drawableRes),
                                        contentDescription = dashboard?.user?.displayName,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }

                                else -> {
                                    Text(
                                        text = initialsFromDisplayName(dashboard?.user?.displayName.orEmpty()),
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            if (activeTab == MobileDashboardTab.CHORES && canManageChores) {
                if (canUseQuickLog) {
                    // Speed dial: two actions available (Quick Log + Create Chore)
                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        AnimatedVisibility(
                            visible = showSpeedDial,
                            enter = fadeIn(animationSpec = tween(160)) + slideInVertically(
                                animationSpec = tween(200),
                                initialOffsetY = { it / 2 }
                            ),
                            exit = fadeOut(animationSpec = tween(120)) + slideOutVertically(
                                animationSpec = tween(160),
                                targetOffsetY = { it / 2 }
                            )
                        ) {
                            Column(
                                horizontalAlignment = Alignment.End,
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                SpeedDialAction(
                                    label = stringResource(R.string.mobile_quick_log_card_title),
                                    icon = Icons.Rounded.Bolt,
                                    onClick = {
                                        showSpeedDial = false
                                        showQuickLogDialog = true
                                    }
                                )
                                SpeedDialAction(
                                    label = stringResource(R.string.mobile_create_action),
                                    icon = Icons.Rounded.Add,
                                    onClick = {
                                        showSpeedDial = false
                                        openTab(MobileDashboardTab.CREATE)
                                    }
                                )
                            }
                        }
                        // Main FAB — rotates + → × when expanded
                        val fabRotation by animateFloatAsState(
                            targetValue = if (showSpeedDial) 45f else 0f,
                            animationSpec = tween(200),
                            label = "fabRotation"
                        )
                        Button(
                            onClick = { showSpeedDial = !showSpeedDial },
                            shape = CircleShape,
                            contentPadding = PaddingValues(0.dp),
                            modifier = Modifier.size(60.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Add,
                                contentDescription = if (showSpeedDial) stringResource(R.string.mobile_update_dismiss) else stringResource(R.string.mobile_create_action),
                                modifier = Modifier
                                    .size(28.dp)
                                    .rotate(fabRotation)
                            )
                        }
                    }
                } else {
                    // Quick Log not available on this plan — single-tap FAB goes straight to Create
                    Button(
                        onClick = { openTab(MobileDashboardTab.CREATE) },
                        shape = CircleShape,
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.size(60.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Add,
                            contentDescription = stringResource(R.string.mobile_create_action),
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 78.dp).padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MobileTabButton(
                        modifier = Modifier.weight(1f),
                        selected = activeTab == MobileDashboardTab.CHORES,
                        label = stringResource(R.string.mobile_tab_chores),
                        iconRes = R.drawable.mobile_nav_chores,
                        showLabel = true,
                        onClick = {
                            openTab(MobileDashboardTab.CHORES)
                            expandedChoreIds = emptySet()
                        }
                    )
                    MobileTabButton(
                        modifier = Modifier.weight(1f),
                        selected = activeTab == MobileDashboardTab.LEADERBOARD,
                        label = stringResource(R.string.mobile_leaderboard),
                        iconRes = R.drawable.mobile_nav_leaderboard,
                        showLabel = true,
                        onClick = {
                            openTab(MobileDashboardTab.LEADERBOARD)
                            expandedChoreIds = emptySet()
                        }
                    )
                    if (canUseRewards) {
                        MobileTabButton(
                            modifier = Modifier.weight(1f),
                            selected = activeTab == MobileDashboardTab.REWARDS || activeTab == MobileDashboardTab.REWARDS_MANAGER,
                            label = stringResource(R.string.mobile_tab_rewards),
                            iconRes = R.drawable.mobile_nav_rewards,
                            showLabel = true,
                            badge = if (isParentOrAdmin) pendingRedemptions.size else 0,
                            onClick = { openTab(if (isCreatorRole) MobileDashboardTab.REWARDS_MANAGER else MobileDashboardTab.REWARDS) }
                        )
                    }
                    MobileTabButton(
                        modifier = Modifier.weight(1f),
                        selected = activeTab == MobileDashboardTab.MORE || activeTab == MobileDashboardTab.TEMPLATE_MANAGER || showMoreSheet,
                        label = stringResource(R.string.mobile_tab_more),
                        iconRes = R.drawable.mobile_nav_more,
                        showLabel = true,
                        onClick = { showMoreSheet = true }
                    )
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
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(padding)
        ) {
            val isTablet = isTabletWidth(maxWidth)
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(
                    state = dashboardListState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = if (isTablet) 28.dp else 6.dp, vertical = 16.dp)
                        .then(if (isTablet) Modifier.widthIn(max = 1280.dp).align(Alignment.TopCenter) else Modifier),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
            if (activeTab == MobileDashboardTab.CHORES) {
                if (sortedChores.isEmpty() && historicChores.isEmpty()) {
                    item { Text(text = noChoresLabel, style = MaterialTheme.typography.bodyMedium) }
                }
                if (canUseTakeoverRequests && incomingTakeoverRequests.isNotEmpty()) {
                        item {
                            TakeoverRequestsPanel(
                                requests = incomingTakeoverRequests,
                                activeTakeoverRequestAction = activeTakeoverRequestAction,
                                onApproveRequest = { requestId -> onRespondToTakeoverRequest(requestId, true) },
                                onDeclineRequest = { requestId -> onRespondToTakeoverRequest(requestId, false) }
                            )
                        }
                    }
                    if (choresOverdue.isNotEmpty()) {
                        mockMobileChoreSection(
                            chores = choresOverdue,
                            title = choresOverdueLabel,
                            currentUserId = currentUserId,
                            currentUserRole = currentUserRole,
                            supportsTakeoverRequests = canUseTakeoverRequests,
                            expandedChoreIds = expandedChoreIds,
                            onExpandedChange = { choreId -> activeNewUiChoreDialogId = choreId },
                            activeReviewAction = activeReviewAction,
                            activeStartAction = activeStartAction,
                            activeSubmitAction = activeSubmitAction,
                            activeCloseCycleAction = activeCloseCycleAction,
                            activeCancelChoreAction = activeCancelChoreAction,
                            activeTakeoverRequestAction = activeTakeoverRequestAction,
                            outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId,
                            submitSelections = submitSelections,
                            selectedProofUris = selectedProofUris,
                            onApprove = onApprove,
                            onReject = onReject,
                            onToggleChecklistItem = onToggleChecklistItem,
                            onPickProofs = onPickProofs,
                            onTakeProofPhoto = onTakeProofPhoto,
                            onStartChore = { choreId -> startConfirmationChoreId = choreId },
                            onCancelChoreOccurrence = onCancelChoreOccurrence,
                            onCloseChoreCycle = onCloseChoreCycle,
                            onCancelChore = onCancelChore,
                            onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId },
                            onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null },
                            onSubmitChore = { choreId -> submitConfirmationChoreId = choreId },
                            activeDueAtAction = activeDueAtAction,
                            onEditChoreDueAt = onEditChoreDueAt,
                            templateVariantsByTemplateId = templateVariantsByTemplateId,
                            activeExternalCompleteAction = activeExternalCompleteAction,
                            onCompleteExternalChore = onCompleteExternalChore,
                            sectionTitleColor = overdueHeaderColor
                        )
                    }
                    mockMobileChoreSection(
                        chores = choresDueToday,
                        title = choresDueTodayLabel,
                        currentUserId = currentUserId,
                        currentUserRole = currentUserRole,
                        supportsTakeoverRequests = canUseTakeoverRequests,
                        expandedChoreIds = expandedChoreIds,
                        onExpandedChange = { choreId -> activeNewUiChoreDialogId = choreId },
                        activeReviewAction = activeReviewAction,
                        activeStartAction = activeStartAction,
                        activeSubmitAction = activeSubmitAction,
                        activeCloseCycleAction = activeCloseCycleAction,
                        activeCancelChoreAction = activeCancelChoreAction,
                        activeTakeoverRequestAction = activeTakeoverRequestAction,
                        outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId,
                        submitSelections = submitSelections,
                        selectedProofUris = selectedProofUris,
                        onApprove = onApprove,
                        onReject = onReject,
                        onToggleChecklistItem = onToggleChecklistItem,
                        onPickProofs = onPickProofs,
                        onTakeProofPhoto = onTakeProofPhoto,
                        onStartChore = { choreId -> startConfirmationChoreId = choreId },
                        onCancelChoreOccurrence = onCancelChoreOccurrence,
                        onCloseChoreCycle = onCloseChoreCycle,
                        onCancelChore = onCancelChore,
                        onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId },
                        onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null },
                        onSubmitChore = { choreId -> submitConfirmationChoreId = choreId },
                        activeDueAtAction = activeDueAtAction,
                        onEditChoreDueAt = onEditChoreDueAt,
                        templateVariantsByTemplateId = templateVariantsByTemplateId,
                        activeExternalCompleteAction = activeExternalCompleteAction,
                        onCompleteExternalChore = onCompleteExternalChore,
                        emptyMessage = noChoresLabel
                    )
                    mockMobileChoreSection(
                        chores = choresDueThisWeek,
                        title = choresDueThisWeekLabel,
                        currentUserId = currentUserId,
                        currentUserRole = currentUserRole,
                        supportsTakeoverRequests = canUseTakeoverRequests,
                        expandedChoreIds = expandedChoreIds,
                        onExpandedChange = { choreId -> activeNewUiChoreDialogId = choreId },
                        activeReviewAction = activeReviewAction,
                        activeStartAction = activeStartAction,
                        activeSubmitAction = activeSubmitAction,
                        activeCloseCycleAction = activeCloseCycleAction,
                        activeCancelChoreAction = activeCancelChoreAction,
                        activeTakeoverRequestAction = activeTakeoverRequestAction,
                        outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId,
                        submitSelections = submitSelections,
                        selectedProofUris = selectedProofUris,
                        onApprove = onApprove,
                        onReject = onReject,
                        onToggleChecklistItem = onToggleChecklistItem,
                        onPickProofs = onPickProofs,
                        onTakeProofPhoto = onTakeProofPhoto,
                        onStartChore = { choreId -> startConfirmationChoreId = choreId },
                        onCancelChoreOccurrence = onCancelChoreOccurrence,
                        onCloseChoreCycle = onCloseChoreCycle,
                        onCancelChore = onCancelChore,
                        onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId },
                        onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null },
                        onSubmitChore = { choreId -> submitConfirmationChoreId = choreId },
                        activeDueAtAction = activeDueAtAction,
                        onEditChoreDueAt = onEditChoreDueAt,
                        templateVariantsByTemplateId = templateVariantsByTemplateId,
                        activeExternalCompleteAction = activeExternalCompleteAction,
                        onCompleteExternalChore = onCompleteExternalChore,
                        emptyMessage = noChoresLabel
                    )
                    mockMobileChoreSection(
                        chores = choresDueLater,
                        title = choresDueLaterLabel,
                        currentUserId = currentUserId,
                        currentUserRole = currentUserRole,
                        supportsTakeoverRequests = canUseTakeoverRequests,
                        expandedChoreIds = expandedChoreIds,
                        onExpandedChange = { choreId -> activeNewUiChoreDialogId = choreId },
                        activeReviewAction = activeReviewAction,
                        activeStartAction = activeStartAction,
                        activeSubmitAction = activeSubmitAction,
                        activeCloseCycleAction = activeCloseCycleAction,
                        activeCancelChoreAction = activeCancelChoreAction,
                        activeTakeoverRequestAction = activeTakeoverRequestAction,
                        outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId,
                        submitSelections = submitSelections,
                        selectedProofUris = selectedProofUris,
                        onApprove = onApprove,
                        onReject = onReject,
                        onToggleChecklistItem = onToggleChecklistItem,
                        onPickProofs = onPickProofs,
                        onTakeProofPhoto = onTakeProofPhoto,
                        onStartChore = { choreId -> startConfirmationChoreId = choreId },
                        onCancelChoreOccurrence = onCancelChoreOccurrence,
                        onCloseChoreCycle = onCloseChoreCycle,
                        onCancelChore = onCancelChore,
                        onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId },
                        onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null },
                        onSubmitChore = { choreId -> submitConfirmationChoreId = choreId },
                        activeDueAtAction = activeDueAtAction,
                        onEditChoreDueAt = onEditChoreDueAt,
                        templateVariantsByTemplateId = templateVariantsByTemplateId,
                        activeExternalCompleteAction = activeExternalCompleteAction,
                        onCompleteExternalChore = onCompleteExternalChore,
                        emptyMessage = noChoresLabel
                    )
                    item {
                        MockMobileCompletedSectionHeader(
                            title = completedChoresLabel,
                            expanded = showCompletedChoresSection,
                            expandedCount = minOf(15, historicChores.size),
                            onToggleExpanded = { showCompletedChoresSection = !showCompletedChoresSection },
                            showLabel = showCompletedLabel,
                            hideLabel = hideCompletedLabel
                        )
                    }
                    if (showCompletedChoresSection) {
                        mockMobileHistoricChoreSection(
                            chores = historicChores.take(15),
                            expandedChoreIds = expandedHistoricChoreIds,
                            onExpandedChange = { choreId -> activeNewUiChoreDialogId = choreId },
                            emptyMessage = noChoresLabel
                        )
                    }
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

            if (activeTab == MobileDashboardTab.LEADERBOARD) {
                item {
                    SectionIntro(
                        title = stringResource(R.string.mobile_leaderboard),
                        body = stringResource(R.string.mobile_leaderboard_hint)
                    )
                }
                if (leaderboardEntries.isEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.mobile_leaderboard_empty),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    item {
                        Card(shape = RoundedCornerShape(24.dp)) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Image(
                                        painter = painterResource(R.drawable.ic_taskbandit_mascot_success),
                                        contentDescription = null,
                                        modifier = Modifier.size(38.dp)
                                    )
                                    Text(
                                        text = stringResource(R.string.mobile_leaderboard_cheer),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                leaderboardEntries.forEachIndexed { index, member ->
                                    LeaderboardEntryRow(
                                        rank = index + 1,
                                        entry = member
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.REWARDS) {
                item {
                    SectionIntro(
                        title = stringResource(R.string.mobile_tab_rewards),
                        body = if (isParentOrAdmin)
                            stringResource(R.string.mobile_rewards_manager_hint)
                        else
                            stringResource(R.string.mobile_rewards_shop_hint, currentUserPoints)
                    )
                }

                if (!isParentOrAdmin) {
                    // ── Child: Shop ─────────────────────────────────────────
                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { rewardsShopTab = "shop" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (rewardsShopTab == "shop") MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surfaceVariant
                                ),
                                modifier = Modifier.weight(1f)
                            ) { Text(stringResource(R.string.mobile_rewards_tab_shop)) }
                            Button(
                                onClick = { rewardsShopTab = "history" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (rewardsShopTab == "history") MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surfaceVariant
                                ),
                                modifier = Modifier.weight(1f)
                            ) { Text(stringResource(R.string.mobile_rewards_tab_history)) }
                        }
                    }
                    if (rewardsShopTab == "shop") {
                        if (enabledRewards.isEmpty()) {
                            item { Text(stringResource(R.string.mobile_rewards_shop_empty), style = MaterialTheme.typography.bodyMedium) }
                        } else {
                            items(enabledRewards) { reward ->
                                val isExclusive = reward.workflowType == "DAILY_EXCLUSIVE"
                                val approvedForThisReward = myRedemptions.filter { it.rewardId == reward.id && it.status == "APPROVED" }
                                // For DAILY_EXCLUSIVE, pending doesn't block (user can book multiple dates)
                                val hasPending = !isExclusive && myRedemptions.any { it.rewardId == reward.id && it.status == "PENDING" }
                                val reachedLimit = reward.maxRedemptionsPerChild != null && approvedForThisReward.size >= reward.maxRedemptionsPerChild
                                val lastApprovedAt = approvedForThisReward.maxByOrNull { it.requestedAtUtc }?.requestedAtUtc
                                val onCooldown = reward.cooldownDays != null && lastApprovedAt != null &&
                                    (System.currentTimeMillis() - parseInstantForSort(lastApprovedAt).toEpochMilli()) < reward.cooldownDays * 86_400_000L
                                val canAfford = currentUserPoints >= reward.pointCost
                                val myUpcomingClaims = reward.upcomingClaims.filter { it.userId == currentUserId }
                                val othersUpcomingClaims = reward.upcomingClaims.filter { it.userId != currentUserId }
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Text(rewardCategoryEmoji(reward.category), style = MaterialTheme.typography.headlineMedium)
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(reward.title, style = MaterialTheme.typography.titleMedium)
                                                reward.description?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                            }
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                            Text(
                                                text = "${reward.pointCost} ${stringResource(R.string.mobile_rewards_pts)}",
                                                style = MaterialTheme.typography.labelLarge,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Button(
                                                onClick = { redeemConfirmRewardId = reward.id },
                                                enabled = canAfford && !onCooldown && !hasPending && !reachedLimit
                                            ) {
                                                Text(
                                                    if (hasPending) stringResource(R.string.mobile_rewards_pending)
                                                    else stringResource(R.string.mobile_rewards_redeem)
                                                )
                                            }
                                        }
                                        if (onCooldown) Text(stringResource(R.string.mobile_rewards_on_cooldown), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                                        if (reachedLimit) Text(stringResource(R.string.mobile_rewards_limit_reached), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                                        if (isExclusive) {
                                            myUpcomingClaims.forEach { claim ->
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Text(
                                                        text = stringResource(R.string.mobile_rewards_your_booking_for, formatBookingDate(claim.targetDate)),
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = MaterialTheme.colorScheme.primary,
                                                        modifier = Modifier.weight(1f)
                                                    )
                                                    TextButton(
                                                        onClick = {
                                                            rescheduleRedemptionId = claim.redemptionId
                                                            rescheduleTargetDate = claim.targetDate
                                                        },
                                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                                                    ) {
                                                        Text(stringResource(R.string.mobile_rewards_reschedule), style = MaterialTheme.typography.labelSmall)
                                                    }
                                                }
                                            }
                                            othersUpcomingClaims.forEach { claim ->
                                                Text(
                                                    text = stringResource(R.string.mobile_rewards_booked_for_date_by, formatBookingDate(claim.targetDate), claim.displayName),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // History tab
                        if (myRedemptions.isEmpty()) {
                            item { Text(stringResource(R.string.mobile_rewards_history_empty), style = MaterialTheme.typography.bodyMedium) }
                        } else {
                            items(myRedemptions.sortedByDescending { it.requestedAtUtc }) { r ->
                                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                                    Row(
                                        modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(r.rewardTitle, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                            if (r.targetDate != null) {
                                                Text(
                                                    text = formatBookingDate(r.targetDate),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.primary
                                                )
                                            }
                                            Text(r.status, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Text("−${r.pointsDeducted} ${stringResource(R.string.mobile_rewards_pts)}", style = MaterialTheme.typography.labelMedium)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // ── Parent / Admin: Approval Queue ──────────────────────
                    if (pendingRedemptions.isEmpty()) {
                        item { Text(stringResource(R.string.mobile_rewards_no_pending), style = MaterialTheme.typography.bodyMedium) }
                    } else {
                        items(pendingRedemptions) { r ->
                            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(r.requestedByName, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(r.rewardTitle, style = MaterialTheme.typography.titleSmall)
                                            if (r.targetDate != null) {
                                                Text(
                                                    text = formatBookingDate(r.targetDate),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.primary
                                                )
                                            }
                                        }
                                        Text("${r.pointsDeducted} ${stringResource(R.string.mobile_rewards_pts)}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = { onResolveRedemption(r.id, true, null) },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                        ) { Text(stringResource(R.string.mobile_rewards_approve)) }
                                        OutlinedButton(
                                            onClick = { rejectRedemptionId = r.id; rejectRedemptionNote = "" },
                                            modifier = Modifier.weight(1f)
                                        ) { Text(stringResource(R.string.mobile_rewards_reject)) }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.CREATE) {
                if (!isCreatorRole) {
                    item { Text(text = stringResource(R.string.mobile_create_no_permission), style = MaterialTheme.typography.bodyMedium) }
                } else if (!canManageChores) {
                    item { Text(text = stringResource(R.string.mobile_feature_chores_manage_disabled), style = MaterialTheme.typography.bodyMedium) }
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
                                        selectedTemplateGroupTitle = visibleTemplateGroupTitle,
                                        templateGroupDropdownExpanded = templateGroupDropdownExpanded,
                                        onTemplateGroupDropdownExpandedChange = { templateGroupDropdownExpanded = it },
                                        onTemplateGroupSelected = {
                                            selectedTemplateGroupTitle = it
                                            selectedTemplateId = templates.firstOrNull { template -> template.groupTitle == it }?.id
                                            createVariantId = null
                                            templateGroupDropdownExpanded = false
                                        },
                                        templateGroups = templateGroups,
                                        selectedTemplate = selectedTemplate,
                                        templateDropdownExpanded = templateDropdownExpanded,
                                        onTemplateDropdownExpandedChange = { templateDropdownExpanded = it },
                                        onTemplateSelected = {
                                            selectedTemplateId = it
                                            templateDropdownExpanded = false
                                        },
                                        templates = visibleTemplates,
                                        createDueAtMillis = createDueAtMillis,
                                        onPickDate = { datePickerDialog.show() },
                                        onPickTime = { timePickerDialog.show() }
                                    )
                                    CreateRecurrencePanel(
                                        createRecurrenceType = createRecurrenceType,
                                        createRecurrenceIntervalInput = createRecurrenceIntervalInput,
                                        createRecurrenceIntervalError = createRecurrenceIntervalError,
                                        createRecurrenceWeekdays = createRecurrenceWeekdays,
                                        createRecurrenceWeekdaysError = createRecurrenceWeekdaysError,
                                        recurrenceTypeDropdownExpanded = recurrenceTypeDropdownExpanded,
                                        onRecurrenceDropdownExpandedChange = { recurrenceTypeDropdownExpanded = it },
                                        onRecurrenceTypeSelected = {
                                            createRecurrenceType = it
                                            createRecurrenceWeekdays =
                                                when (it) {
                                                    "template" -> templateRecurrenceWeekdayDefaults(selectedTemplate?.recurrence)
                                                    "custom_weekly" ->
                                                        if (createRecurrenceWeekdays.isNotEmpty()) {
                                                            createRecurrenceWeekdays
                                                        } else {
                                                            listOf(weekdayTokenForEpochMillis(createDueAtMillis))
                                                        }
                                                    else -> emptyList()
                                                }
                                            recurrenceTypeDropdownExpanded = false
                                        },
                                        onRecurrenceIntervalChange = { v ->
                                            if (v.all(Char::isDigit)) {
                                                createRecurrenceIntervalInput = v
                                            }
                                        },
                                        onToggleRecurrenceWeekday = { weekday ->
                                            createRecurrenceWeekdays =
                                                if (createRecurrenceWeekdays.contains(weekday)) {
                                                    createRecurrenceWeekdays - weekday
                                                } else {
                                                    createRecurrenceWeekdays + weekday
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
                                            assignmentStrategyDropdownExpanded = false
                                        },
                                        createAssigneeId = createAssigneeId,
                                        assigneeDropdownExpanded = assigneeDropdownExpanded,
                                        onAssigneeDropdownExpandedChange = { assigneeDropdownExpanded = it },
                                        onAssigneeSelected = {
                                            createAssigneeId = it
                                            assigneeDropdownExpanded = false
                                        },
                                        members = assignableMembers
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
                                        createRecurrenceWeekdays = createRecurrenceWeekdays,
                                        createRecurrenceWeekdaysError = createRecurrenceWeekdaysError,
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
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                CreateTemplateAndSchedulePanel(
                                    selectedTemplateGroupTitle = visibleTemplateGroupTitle,
                                    templateGroupDropdownExpanded = templateGroupDropdownExpanded,
                                    onTemplateGroupDropdownExpandedChange = { templateGroupDropdownExpanded = it },
                                    onTemplateGroupSelected = {
                                        selectedTemplateGroupTitle = it
                                        selectedTemplateId = templates.firstOrNull { template -> template.groupTitle == it }?.id
                                        createVariantId = null
                                        templateGroupDropdownExpanded = false
                                    },
                                    templateGroups = templateGroups,
                                    selectedTemplate = selectedTemplate,
                                    templateDropdownExpanded = templateDropdownExpanded,
                                    onTemplateDropdownExpandedChange = { templateDropdownExpanded = it },
                                    onTemplateSelected = {
                                        selectedTemplateId = it
                                        templateDropdownExpanded = false
                                    },
                                    templates = visibleTemplates,
                                    createDueAtMillis = createDueAtMillis,
                                    onPickDate = { datePickerDialog.show() },
                                    onPickTime = { timePickerDialog.show() },
                                    compact = true
                                )
                                CreateRecurrencePanel(
                                    createRecurrenceType = createRecurrenceType,
                                    createRecurrenceIntervalInput = createRecurrenceIntervalInput,
                                    createRecurrenceIntervalError = createRecurrenceIntervalError,
                                    createRecurrenceWeekdays = createRecurrenceWeekdays,
                                    createRecurrenceWeekdaysError = createRecurrenceWeekdaysError,
                                    recurrenceTypeDropdownExpanded = recurrenceTypeDropdownExpanded,
                                    onRecurrenceDropdownExpandedChange = { recurrenceTypeDropdownExpanded = it },
                                    onRecurrenceTypeSelected = {
                                        createRecurrenceType = it
                                        createRecurrenceWeekdays =
                                            when (it) {
                                                "template" -> templateRecurrenceWeekdayDefaults(selectedTemplate?.recurrence)
                                                "custom_weekly" ->
                                                    if (createRecurrenceWeekdays.isNotEmpty()) {
                                                        createRecurrenceWeekdays
                                                    } else {
                                                        listOf(weekdayTokenForEpochMillis(createDueAtMillis))
                                                    }
                                                else -> emptyList()
                                            }
                                        recurrenceTypeDropdownExpanded = false
                                    },
                                    onRecurrenceIntervalChange = { v ->
                                        if (v.all(Char::isDigit)) {
                                            createRecurrenceIntervalInput = v
                                        }
                                    },
                                    onToggleRecurrenceWeekday = { weekday ->
                                        createRecurrenceWeekdays =
                                            if (createRecurrenceWeekdays.contains(weekday)) {
                                                createRecurrenceWeekdays - weekday
                                            } else {
                                                createRecurrenceWeekdays + weekday
                                            }
                                    },
                                    compact = true,
                                    collapsedByDefault = true
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
                                    onPickEndTime = { recurrenceEndTimePickerDialog.show() },
                                    compact = true,
                                    collapsedByDefault = true
                                )
                                CreateAssignmentPanel(
                                    createAssignmentStrategy = createAssignmentStrategy,
                                    assignmentStrategyDropdownExpanded = assignmentStrategyDropdownExpanded,
                                    onAssignmentDropdownExpandedChange = { assignmentStrategyDropdownExpanded = it },
                                    onAssignmentStrategySelected = { strategy ->
                                        createAssignmentStrategy = strategy
                                        assignmentStrategyDropdownExpanded = false
                                    },
                                    createAssigneeId = createAssigneeId,
                                    assigneeDropdownExpanded = assigneeDropdownExpanded,
                                    onAssigneeDropdownExpandedChange = { assigneeDropdownExpanded = it },
                                    onAssigneeSelected = {
                                        createAssigneeId = it
                                        assigneeDropdownExpanded = false
                                    },
                                    members = assignableMembers,
                                    compact = true,
                                    collapsedByDefault = true
                                )
                                CreateVariantPanel(
                                    selectedTemplate = selectedTemplate,
                                    createVariantId = createVariantId,
                                    variantDropdownExpanded = variantDropdownExpanded,
                                    onVariantDropdownExpandedChange = { variantDropdownExpanded = it },
                                    onVariantSelected = {
                                        createVariantId = it
                                        variantDropdownExpanded = false
                                    },
                                    compact = true,
                                    collapsedByDefault = true
                                )
                                CreateSubmitPanel(
                                    selectedTemplate = selectedTemplate,
                                    createDueAtMillis = createDueAtMillis,
                                    createAssigneeId = createAssigneeId,
                                    createAssignmentStrategy = createAssignmentStrategy,
                                    createRecurrenceType = createRecurrenceType,
                                    createRecurrenceInterval = parsedCreateRecurrenceInterval,
                                    createRecurrenceIntervalError = createRecurrenceIntervalError,
                                    createRecurrenceWeekdays = createRecurrenceWeekdays,
                                    createRecurrenceWeekdaysError = createRecurrenceWeekdaysError,
                                    createRecurrenceEndMode = createRecurrenceEndMode,
                                    createRecurrenceOccurrences = parsedCreateRecurrenceOccurrences,
                                    createRecurrenceOccurrencesError = createRecurrenceOccurrencesError,
                                    createRecurrenceEndsAtMillis = createRecurrenceEndsAtMillis,
                                    createRecurrenceEndDateError = createRecurrenceEndDateError,
                                    createVariantId = createVariantId,
                                    activeCreateAction = activeCreateAction,
                                    onCreateChore = onCreateChore,
                                    compact = true
                                )
                            }
                        }
                    }
                }
            }

            if (activeTab == MobileDashboardTab.MORE) {
                item {
                    SectionIntro(
                        title = stringResource(R.string.mobile_settings_title),
                        body = stringResource(R.string.mobile_settings_hint),
                        compact = true
                    )
                }
                item {
                    SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Tune, title = stringResource(R.string.mobile_settings_appearance)) {
                        SettingsAppearanceContent(
                            themeMode = themeMode,
                            onThemeModeChange = onThemeModeChange,
                            languageTag = languageTag,
                            onLanguageTagChange = onLanguageTagChange
                        )
                    }
                }
                item {
                    SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Smartphone, title = stringResource(R.string.mobile_settings_device)) {
                        SettingsDeviceContent(currentDevice = currentDevice, installationId = installationId, notificationsPermissionGranted = notificationsPermissionGranted, isBusy = isBusy, activeDeviceAction = activeDeviceAction, onRefresh = onRefresh, onRequestNotificationPermission = onRequestNotificationPermission, onRemoveNotificationDevice = onRemoveNotificationDevice)
                    }
                }
                if (hostedSubscription.hostedMode && isCreatorRole) {
                    item {
                        SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.AssignmentTurnedIn, title = stringResource(R.string.mobile_settings_plan_features)) {
                            SettingsPlanContent(hostedSubscription = hostedSubscription)
                        }
                    }
                }
                item {
                    SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Language, title = stringResource(R.string.mobile_settings_release)) {
                        SettingsReleaseContent(currentReleaseLabel = currentReleaseLabel, serverReleaseLabel = serverReleaseLabel, serverUrl = serverUrl, availableUpdate = availableUpdate, onDismissUpdate = onDismissUpdate, githubCheckDone = githubCheckDone, githubCheckError = githubCheckError, githubLatestVersion = githubLatestVersion, onCheckForUpdates = onCheckForUpdates)
                    }
                }
                if (visibleGithubUpdate != null) {
                    item {
                        SettingsGithubUpdateCard(
                            update = visibleGithubUpdate,
                            currentReleaseLabel = currentReleaseLabel,
                            isDownloadingUpdate = isDownloadingUpdate,
                            downloadProgress = downloadProgress,
                            downloadError = downloadError,
                            onDismissGithubUpdate = onDismissGithubUpdate,
                            onDownloadAndInstall = onDownloadAndInstall,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                item {
                    SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Menu, title = stringResource(R.string.mobile_settings_actions)) {
                        SettingsSessionContent(isBusy = isBusy, onRefresh = onRefresh, onDownloadSettingsLogs = onDownloadSettingsLogs)
                    }
                }
                item {
                    SettingsSectionCard(modifier = Modifier.fillMaxWidth(), icon = Icons.AutoMirrored.Rounded.Logout, title = stringResource(R.string.mobile_logout)) {
                        SettingsLogoutContent(onLogout = onLogout)
                    }
                }
            }

                }

                // ── Full-screen overlays for virtual tabs ─────────────────────────────
                // Rendered OUTSIDE the LazyColumn so they get proper bounded constraints
                // (Scaffold and nested LazyColumn both require bounded height).
                if (activeTab == MobileDashboardTab.TEMPLATE_MANAGER) {
                    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                        TemplateManagerScreen(
                            templates = templateManagerTemplates,
                            isLoading = templateManagerLoading,
                            error = templateManagerError,
                            allTemplates = templateManagerTemplates,
                            onRefresh = onLoadTemplatesForManager,
                            onCreateTemplate = onCreateTemplate,
                            onUpdateTemplate = onUpdateTemplate,
                            onDeleteTemplate = onDeleteTemplate,
                            onResetToDefaults = onResetTemplatesToDefaults,
                            canManageTemplates = canManageTemplates,
                            isAdmin = currentUserRole == "admin"
                        )
                    }
                }

                if (activeTab == MobileDashboardTab.REWARDS_MANAGER) {
                    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                        RewardsManagerScreen(
                            allRewards = dashboard?.rewards.orEmpty(),
                            pendingRedemptions = dashboard?.redemptions.orEmpty().filter { it.status == "PENDING" },
                            currentUserPoints = currentUserPoints,
                            isAdmin = dashboard?.user?.role == "admin",
                            onCreateReward = onCreateReward,
                            onUpdateReward = onUpdateReward,
                            onDeleteReward = onDeleteReward,
                            onToggleReward = onToggleReward,
                            onApproveRedemption = { id -> onResolveRedemption(id, true, null) },
                            onRejectRedemption = { id, note -> onResolveRedemption(id, false, note) },
                            onRedeemReward = { rewardId, _ -> redeemConfirmRewardId = rewardId },
                            onRescheduleRedemption = { redemptionId, targetDate ->
                                rescheduleRedemptionId = redemptionId
                                rescheduleTargetDate = targetDate
                            }
                        )
                    }
                }

                if (activeTab == MobileDashboardTab.CHORES && showDashboardSyncNotice && hasSyncFailureContext) {
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

                AnimatedVisibility(
                    visible = visibleGithubUpdate != null && activeTab == MobileDashboardTab.CHORES,
                    enter = fadeIn(animationSpec = tween(300)),
                    exit = fadeOut(animationSpec = tween(200)),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        // Leave extra room on the right so the dismiss ✕ button is not
                        // hidden behind the circular create FAB (60dp + 16dp margin + 8dp gap).
                        .padding(
                            start = 16.dp,
                            end = if (canManageChores && !isTablet) 92.dp else 16.dp,
                            top = 16.dp,
                            bottom = 16.dp
                        )
                        .then(if (isTablet) Modifier.widthIn(max = 480.dp) else Modifier)
                ) {
                    visibleGithubUpdate?.let { update ->
                        Card(
                            onClick = { openTab(MobileDashboardTab.MORE); shouldScrollToUpdate = true },
                            shape = RoundedCornerShape(20.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            ),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.28f))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 16.dp, end = 6.dp, top = 12.dp, bottom = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.SystemUpdate,
                                    contentDescription = null,
                                    modifier = Modifier.size(22.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = stringResource(R.string.mobile_update_banner_title, "v${update.version}"),
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = stringResource(R.string.mobile_update_banner_body),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.72f)
                                    )
                                }
                                IconButton(
                                    onClick = onDismissGithubUpdate,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.Close,
                                        contentDescription = stringResource(R.string.mobile_update_dismiss),
                                        modifier = Modifier.size(18.dp),
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.6f)
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
private fun QuickLogMatchChip(
    icon: String?,
    label: String,
    @Suppress("UNUSED_PARAMETER") title: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val iconDrawable = resolveChoreIconDrawableFromToken(icon)
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(
            1.dp,
            if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.24f)
        ),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.42f) else MaterialTheme.colorScheme.surface
        ),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (iconDrawable != null) {
                Image(
                    painter = painterResource(iconDrawable),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(22.dp)
                )
            }
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
@Composable
private fun SpeedDialAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.inverseSurface,
            tonalElevation = 2.dp
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.inverseOnSurface,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }
        Button(
            onClick = onClick,
            shape = CircleShape,
            contentPadding = PaddingValues(0.dp),
            modifier = Modifier.size(46.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}
@Composable
private fun MobileTabButton(
    modifier: Modifier = Modifier,
    selected: Boolean,
    label: String,
    @DrawableRes iconRes: Int,
    showLabel: Boolean = false,
    enabled: Boolean = true,
    badge: Int = 0,
    onClick: () -> Unit
) {
    val iconTint = when {
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        selected -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val chipColor = if (selected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)
    }
    val chipBorderColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outline.copy(alpha = 0.32f)
    }
    // Use Column+clickable instead of TextButton so Compose doesn't clip
    // the label text to the TextButton's pill/stadium shape. "Leaderboard"
    // (the longest label) was being cut off at the circle icon edges.
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 1.dp, vertical = 2.dp)
            .semantics(mergeDescendants = true) { contentDescription = label },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Box(contentAlignment = Alignment.TopEnd) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(chipColor, CircleShape)
                    .border(BorderStroke(if (selected) 2.dp else 1.dp, chipBorderColor), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = iconRes),
                    contentDescription = null,
                    modifier = Modifier
                        .size(32.dp)
                        .alpha(if (enabled) 1f else 0.45f)
                )
            }
            if (badge > 0) {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .background(Color(0xFFFF6B6B), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = badge.coerceAtMost(99).toString(),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = Color.White,
                        maxLines = 1
                    )
                }
            }
        }
        if (showLabel) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = MaterialTheme.typography.labelSmall.fontSize * 1.04f),
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (selected) {
            Box(
                modifier = Modifier
                    .size(width = 14.dp, height = 3.dp)
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(999.dp))
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
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    val baseContainerColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.82f)
    }
    val containerColor = if (enabled) baseContainerColor else baseContainerColor.copy(alpha = 0.35f)
    val iconTint = if (enabled) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f)

    TextButton(
        modifier = modifier,
        onClick = onClick,
        enabled = enabled,
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
                color = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
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
internal fun SectionIntro(title: String, body: String, compact: Boolean = false, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(if (compact) 4.dp else 6.dp)) {
        Text(
            text = title,
            style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        Text(text = body, style = if (compact) MaterialTheme.typography.bodySmall else MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun LeaderboardEntryRow(
    rank: Int,
    entry: MobileLeaderboardEntry
) {
    val trophyTint = when (rank) {
        1 -> Color(0xFFD4AF37)
        2 -> Color(0xFFC0C0C0)
        3 -> Color(0xFFCD7F32)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Rounded.EmojiEvents,
                    contentDescription = null,
                    tint = trophyTint,
                    modifier = Modifier.size(20.dp)
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "$rank. ${entry.displayName}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (entry.isExternal) {
                            Surface(
                                shape = RoundedCornerShape(999.dp),
                                color = MaterialTheme.colorScheme.secondaryContainer
                            ) {
                                Text(
                                    text = "ext",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Text(
                        text = if (entry.isExternal) {
                            "External helper"
                        } else {
                            "${formatLeaderboardRoleLabel(entry.role)} - ${stringResource(R.string.mobile_streak_value, entry.currentStreak)}"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Text(
                    text = stringResource(R.string.mobile_points_value, entry.points),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun ChoreActionSheet(
    chore: MobileChore,
    currentUserId: String?,
    currentUserRole: String?,
    supportsTakeoverRequests: Boolean,
    outgoingTakeoverRequest: MobileTakeoverRequest?,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeCancelChoreAction: String?,
    activeTakeoverRequestAction: String?,
    activeDueAtAction: String?,
    activeExternalCompleteAction: String?,
    selectedChecklistIds: Set<String>,
    selectedProofCount: Int,
    editableVariants: List<com.taskbandit.app.mobile.MobileTemplateVariant>,
    onDismiss: () -> Unit,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onClaimChore: (String) -> Unit,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String) -> Unit,
    onSubmitChore: (String) -> Unit,
    onEditChoreDueAt: (String, String, String, String?) -> Unit,
    onCancelChoreOccurrence: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onCancelChore: (String) -> Unit,
    onCompleteExternalChore: (String, String) -> Unit
) {
    val context = LocalContext.current
    val featureAccess = LocalMobileFeatureAccess.current
    val canManageChores = featureAccess.choresManage
    val canApproveChores = featureAccess.approvals
    val canUseDirectTakeover = featureAccess.takeoverDirect
    val canUseTakeoverRequestsLocal = featureAccess.takeoverRequests && supportsTakeoverRequests
    val canCompleteExternal = featureAccess.externalCompletion && currentUserRole != "child"
    val isPendingApproval = chore.state == "pending_approval"
    val isSubmittableState = chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
    val isAssignedToCurrentUser = chore.assigneeId != null && chore.assigneeId == currentUserId
    val isUnassigned = chore.assigneeId == null
    val canClaimChore = canManageChores && isSubmittableState && !isAssignedToCurrentUser && (isUnassigned || canUseDirectTakeover)
    val canSubmit = canManageChores && isAssignedToCurrentUser && isSubmittableState
    val hasPendingOutgoingTakeover = outgoingTakeoverRequest?.status == "PENDING"
    val canRequestTakeover = canManageChores && canUseTakeoverRequestsLocal && currentUserRole != "child" && chore.assigneeId == currentUserId && !hasPendingOutgoingTakeover
    val canEditDueAt = canManageChores && currentUserRole != "child" && chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
    val canCancelOccurrence = canManageChores && currentUserRole != "child" && chore.supportsOccurrenceCancellation
    val canCloseCycle = canManageChores && currentUserRole != "child" && chore.supportsSeriesCancellation
    val canCancelChore = canManageChores && currentUserRole != "child" && isSubmittableState && !canCancelOccurrence && !canCloseCycle
    val hasAnyPrimaryAction = (isPendingApproval && canApproveChores) || canSubmit || canClaimChore
    val hasSecondaryActions = canRequestTakeover || canEditDueAt || canCancelOccurrence || canCloseCycle || canCancelChore || (canCompleteExternal && isSubmittableState)

    val zoneId = remember { ZoneId.systemDefault() }
    var moreExpanded by remember { mutableStateOf(false) }
    var showApproveConfirm by remember { mutableStateOf(false) }
    var showRejectConfirm by remember { mutableStateOf(false) }
    var showCancelOccurrenceConfirm by remember { mutableStateOf(false) }
    var showCloseCycleConfirm by remember { mutableStateOf(false) }
    var showCancelChoreConfirm by remember { mutableStateOf(false) }
    var showExternalCompleteDialog by remember { mutableStateOf(false) }
    var externalCompleterNameInput by remember { mutableStateOf("") }
    var showDueAtEditor by remember { mutableStateOf(false) }
    var dueAtEditorTitle by remember(chore.id, chore.title) { mutableStateOf(chore.title) }
    var dueAtEditorVariantId by remember(chore.id, chore.variantId) { mutableStateOf(chore.variantId ?: "") }
    var dueAtVariantDropdownExpanded by remember { mutableStateOf(false) }
    var dueAtEditorMillis by remember(chore.id, chore.dueAt) {
        mutableLongStateOf(
            runCatching { Instant.parse(chore.dueAt).toEpochMilli() }.getOrElse { System.currentTimeMillis() }
        )
    }
    val dueAtEditorDatePicker = remember(context, dueAtEditorMillis) {
        val ldt = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
        DatePickerDialog(context, { _, year, month, day ->
            val existing = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
            dueAtEditorMillis = existing.withYear(year).withMonth(month + 1).withDayOfMonth(day).atZone(zoneId).toInstant().toEpochMilli()
        }, ldt.year, ldt.monthValue - 1, ldt.dayOfMonth)
    }
    val dueAtEditorTimePicker = remember(context, dueAtEditorMillis) {
        val ldt = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
        TimePickerDialog(context, { _, h, m ->
            val existing = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
            dueAtEditorMillis = existing.withHour(h).withMinute(m).withSecond(0).withNano(0).atZone(zoneId).toInstant().toEpochMilli()
        }, ldt.hour, ldt.minute, true)
    }

    val baseTypeTitle = chore.typeTitle.ifBlank { chore.title }
    val choreIconDrawable = resolveChoreIconDrawable(baseTypeTitle, chore.groupTitle, chore.subtypeLabel)
    val typeTitle = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(baseTypeTitle))
    val dueFormatted = formatDueAtForMockCard(chore.dueAt)
    val isDueSoon = isDueSoonForMockCard(chore.dueAt)
    val subtypeLabel = normalizeSubtypeLabel(chore.subtypeLabel)
    val activeDueAtActionKey = "update-due:${chore.id}"

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
    if (showCancelOccurrenceConfirm) {
        AlertDialog(
            onDismissRequest = { showCancelOccurrenceConfirm = false },
            title = { Text(stringResource(R.string.mobile_cancel_occurrence_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_cancel_occurrence_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = { showCancelOccurrenceConfirm = false; onCancelChoreOccurrence(chore.id) }) {
                    Text(stringResource(R.string.mobile_cancel_occurrence_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCancelOccurrenceConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }
    if (showCloseCycleConfirm) {
        AlertDialog(
            onDismissRequest = { showCloseCycleConfirm = false },
            title = { Text(stringResource(R.string.mobile_cancel_series_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_cancel_series_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = { showCloseCycleConfirm = false; onCloseChoreCycle(chore.id) }) {
                    Text(stringResource(R.string.mobile_cancel_series_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCloseCycleConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }
    if (showCancelChoreConfirm) {
        AlertDialog(
            onDismissRequest = { showCancelChoreConfirm = false },
            title = { Text(stringResource(R.string.mobile_cancel_chore_confirm_title)) },
            text = { Text(stringResource(R.string.mobile_cancel_chore_confirm_body, chore.title)) },
            confirmButton = {
                Button(onClick = { showCancelChoreConfirm = false; onCancelChore(chore.id) }) {
                    Text(stringResource(R.string.mobile_cancel_chore_confirm_action))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCancelChoreConfirm = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }
    if (showExternalCompleteDialog) {
        AlertDialog(
            onDismissRequest = { showExternalCompleteDialog = false; externalCompleterNameInput = "" },
            title = { Text(stringResource(R.string.mobile_complete_external_dialog_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.mobile_complete_external_dialog_body, chore.title))
                    OutlinedTextField(
                        value = externalCompleterNameInput,
                        onValueChange = { externalCompleterNameInput = it },
                        label = { Text(stringResource(R.string.mobile_complete_external_name_label)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val name = externalCompleterNameInput.trim()
                        showExternalCompleteDialog = false
                        externalCompleterNameInput = ""
                        onCompleteExternalChore(chore.id, name)
                    },
                    enabled = activeExternalCompleteAction == null && externalCompleterNameInput.isNotBlank()
                ) {
                    Text(stringResource(
                        if (activeExternalCompleteAction == "complete-external:${chore.id}") R.string.mobile_completing_external
                        else R.string.mobile_complete_external_confirm
                    ))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showExternalCompleteDialog = false; externalCompleterNameInput = "" }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }
    if (showDueAtEditor) {
        AlertDialog(
            onDismissRequest = { showDueAtEditor = false },
            title = { Text(stringResource(R.string.mobile_edit_due_at_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.mobile_edit_due_at_body, chore.title))
                    OutlinedTextField(
                        value = dueAtEditorTitle,
                        onValueChange = { dueAtEditorTitle = it },
                        label = { Text(stringResource(R.string.mobile_chore_title_label)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    if (editableVariants.isNotEmpty()) {
                        ExposedDropdownMenuBox(
                            expanded = dueAtVariantDropdownExpanded,
                            onExpandedChange = { dueAtVariantDropdownExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = editableVariants.firstOrNull { it.id == dueAtEditorVariantId }?.label
                                    ?: stringResource(R.string.mobile_create_select_variant_prompt),
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = dueAtVariantDropdownExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            )
                            ExposedDropdownMenu(
                                expanded = dueAtVariantDropdownExpanded,
                                onDismissRequest = { dueAtVariantDropdownExpanded = false }
                            ) {
                                editableVariants.forEach { variant ->
                                    DropdownMenuItem(
                                        text = { Text(variant.label) },
                                        onClick = { dueAtEditorVariantId = variant.id; dueAtVariantDropdownExpanded = false }
                                    )
                                }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { dueAtEditorDatePicker.show() }) {
                            Text(stringResource(R.string.mobile_create_pick_date))
                        }
                        OutlinedButton(onClick = { dueAtEditorTimePicker.show() }) {
                            Text(stringResource(R.string.mobile_create_pick_time))
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDueAtEditor = false
                        onEditChoreDueAt(
                            chore.id,
                            Instant.ofEpochMilli(dueAtEditorMillis).toString(),
                            dueAtEditorTitle.trim(),
                            dueAtEditorVariantId.ifBlank { null }
                        )
                    },
                    enabled = activeDueAtAction == null
                ) {
                    Text(stringResource(
                        if (activeDueAtAction == activeDueAtActionKey) R.string.mobile_updating_due_at
                        else R.string.mobile_edit_due_at_confirm
                    ))
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDueAtEditor = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 300.dp)
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (choreIconDrawable != null) {
                Image(
                    painter = painterResource(choreIconDrawable),
                    contentDescription = null,
                    modifier = Modifier.size(44.dp),
                    contentScale = ContentScale.Fit
                )
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(text = typeTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(
                    text = "${chore.groupTitle.ifBlank { "Home" }} · $dueFormatted",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!subtypeLabel.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Text(
                            text = subtypeLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                }
                if (chore.isOverdue || isDueSoon) {
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = if (chore.isOverdue) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.tertiaryContainer
                    ) {
                        Text(
                            text = if (chore.isOverdue) stringResource(R.string.mobile_state_overdue) else "Due soon",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (chore.isOverdue) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }
                if (chore.assigneeDisplayName != null) {
                    Text(
                        text = stringResource(R.string.mobile_chore_assigned_to, chore.assigneeDisplayName),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        HorizontalDivider()

        chore.triggerInfo?.let { trigger ->
            val completerName = when {
                trigger.completedByExternal && !trigger.externalCompleterName.isNullOrBlank() ->
                    trigger.externalCompleterName!!
                !trigger.completedByDisplayName.isNullOrBlank() ->
                    trigger.completedByDisplayName!!
                else -> "someone"
            }
            val whenStr = trigger.completedAt
                ?.let { runCatching { formatDueAtForCard(it) }.getOrElse { "" } }
                .orEmpty()
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Link,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = buildString {
                            append("After: ${trigger.title}")
                            if (whenStr.isNotBlank()) append(" · $whenStr")
                            append(" by $completerName")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        if (isPendingApproval && canApproveChores) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { showApproveConfirm = true },
                    enabled = activeReviewAction == null,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(stringResource(if (activeReviewAction == "approve:${chore.id}") R.string.mobile_approving else R.string.mobile_approve))
                }
                OutlinedButton(
                    onClick = { showRejectConfirm = true },
                    enabled = activeReviewAction == null,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(stringResource(if (activeReviewAction == "reject:${chore.id}") R.string.mobile_rejecting else R.string.mobile_reject))
                }
            }
        }

        if (canSubmit) {
            Button(
                onClick = { onSubmitChore(chore.id) },
                modifier = Modifier.fillMaxWidth(),
                enabled = activeSubmitAction == null
            ) {
                Text(stringResource(R.string.mobile_submit))
            }
        }

        if (canClaimChore) {
            Button(
                onClick = {
                    if (isUnassigned) onClaimChore(chore.id) else onTakeOverChore(chore.id)
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = activeStartAction == null
            ) {
                Text(stringResource(
                    if (isUnassigned) {
                        if (activeStartAction == "start:${chore.id}") R.string.mobile_starting else R.string.mobile_claim_task
                    } else {
                        if (activeStartAction == "takeover:${chore.id}") R.string.mobile_taking_over_task else R.string.mobile_take_over_task
                    }
                ))
            }
        }

        val isTakeoverPossible = !isAssignedToCurrentUser && !isUnassigned &&
            (canUseDirectTakeover || canUseTakeoverRequestsLocal)
        if (!hasAnyPrimaryAction && !hasSecondaryActions && isTakeoverPossible) {
            Text(
                text = stringResource(R.string.mobile_chore_read_only_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (hasSecondaryActions) {
            if (hasAnyPrimaryAction) HorizontalDivider()
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { moreExpanded = !moreExpanded },
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.mobile_chore_actions_more), style = MaterialTheme.typography.bodyMedium)
                    Icon(
                        imageVector = if (moreExpanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            AnimatedVisibility(visible = moreExpanded) {
                Column {
                    if (canRequestTakeover) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.SwapHoriz,
                            label = stringResource(
                                if (activeTakeoverRequestAction?.startsWith("request:${chore.id}:") == true) R.string.mobile_request_takeover_sending
                                else R.string.mobile_request_takeover
                            ),
                            enabled = activeTakeoverRequestAction == null,
                            onClick = { onRequestTakeover(chore.id) }
                        )
                    }
                    if (canEditDueAt) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.CalendarMonth,
                            label = stringResource(R.string.mobile_edit_due_at),
                            enabled = activeDueAtAction == null,
                            onClick = { showDueAtEditor = true }
                        )
                    }
                    if (canCancelOccurrence) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.EventBusy,
                            label = stringResource(R.string.mobile_cancel_occurrence),
                            enabled = activeCloseCycleAction == null,
                            onClick = { showCancelOccurrenceConfirm = true }
                        )
                    }
                    if (canCloseCycle) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.EventBusy,
                            label = stringResource(R.string.mobile_cancel_series),
                            enabled = activeCloseCycleAction == null,
                            onClick = { showCloseCycleConfirm = true }
                        )
                    }
                    if (canCancelChore) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.EventBusy,
                            label = stringResource(R.string.mobile_cancel_chore),
                            enabled = activeCancelChoreAction == null,
                            onClick = { showCancelChoreConfirm = true }
                        )
                    }
                    if (canCompleteExternal && isSubmittableState) {
                        SecondaryActionRow(
                            icon = Icons.Rounded.HowToReg,
                            label = stringResource(
                                if (activeExternalCompleteAction == "complete-external:${chore.id}") R.string.mobile_completing_external
                                else R.string.mobile_complete_external
                            ),
                            enabled = activeExternalCompleteAction == null,
                            onClick = { showExternalCompleteDialog = true }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SecondaryActionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f),
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.Rounded.ChevronRight,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = if (enabled) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
        )
    }
}



