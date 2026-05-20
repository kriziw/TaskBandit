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
import androidx.compose.animation.AnimatedVisibility
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
import com.taskbandit.app.push.TaskBanditFirebasePushManager
import com.taskbandit.app.ui.theme.TaskBanditTheme
import com.taskbandit.app.widget.TaskBanditWidgetProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

private const val defaultApiBaseUrl = "https://api.taskbandit.app"
private const val androidOidcCallbackUrl = "taskbandit://auth/callback"
private const val syncDisconnectNoticeDelayMs = 3500L
private const val syncStartupNoticeGraceMs = 6000L
private const val mutationReconnectWindowMs = 5000L
private const val mutationReconnectRetryDelayMs = 750L
private val historicChoreStates = setOf("completed", "approved", "rejected", "cancelled")
private val numberFormatter: NumberFormat = NumberFormat.getIntegerInstance()

private data class AndroidOidcResult(
    val accessToken: String? = null,
    val errorMessage: String? = null
)

private enum class MobileDashboardTab {
    CHORES,
    LEADERBOARD,
    CREATE,
    SETTINGS
}

private enum class MobileChoreSection {
    MINE,
    UNASSIGNED,
    OTHERS
}

internal data class TemplateCreateCapabilities(
    val canOpenCreateTab: Boolean,
    val canEditTemplates: Boolean
)

internal fun resolveTemplateCreateCapabilities(
    userFeatureAccess: MobileFeatureAccess,
    hostedFeatureAccess: MobileFeatureAccess
): TemplateCreateCapabilities {
    val canManageChores = userFeatureAccess.choresManage || hostedFeatureAccess.choresManage
    val canManageTemplates = userFeatureAccess.templatesManage || hostedFeatureAccess.templatesManage
    return TemplateCreateCapabilities(
        canOpenCreateTab = canManageChores,
        canEditTemplates = canManageTemplates
    )
}

private enum class MobileChoreSectionTone {
    OVERDUE,
    MINE,
    UNASSIGNED,
    OTHERS,
    HISTORIC
}

private val LocalMobileFeatureAccess = compositionLocalOf { MobileFeatureAccess() }
private val LocalIsNewMobileUi = compositionLocalOf { true }

private fun isTabletWidth(maxWidth: Dp): Boolean = maxWidth >= 840.dp

private data class MobileDashboardRefresh(
    val dashboard: MobileDashboard,
    val latestReleaseInfo: MobileReleaseInfo?,
    val notificationDevices: List<MobileNotificationDevice>,
    val hostedSubscription: MobileHostedSubscriptionOverview
)

private data class GitHubReleaseInfo(val version: String, val apkDownloadUrl: String, val body: String)

private data class MobileChoiceOption(
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

private val quickLogIconCheck = "\u2705"
private val quickLogIconBroom = String(Character.toChars(0x1F9F9))
private val quickLogIconBasket = String(Character.toChars(0x1F9FA))
private val quickLogIconTrash = String(Character.toChars(0x1F5D1))
private val quickLogIconPlate = String(Character.toChars(0x1F37D))
private val quickLogIconBath = String(Character.toChars(0x1F6C1))
private val quickLogIconTeddy = String(Character.toChars(0x1F9F8))
private val quickLogIconCart = String(Character.toChars(0x1F6D2))
private val quickLogIconBox = String(Character.toChars(0x1F4E6))
private val quickLogIconSparkle = "\u2728"
private val quickLogLegacyMojibakePrefix = Regex("^[\\u00C3\\u00E2\\u00F0]")
private val quickLogDrawableIconIds = listOf(
    "take_out_trash", "recycle_sorting", "feed_pets", "wash_dishes_sink",
    "make_bed", "change_bed_sheets", "do_laundry", "vacuum_floor",
    "water_plants", "clean_toilet", "clean_mirror_sink", "wipe_counter",
    "dishwasher", "grocery_shopping", "sort_mail"
)

private val quickLogIconOptions = listOf(
    quickLogIconCheck,
    quickLogIconBroom,
    quickLogIconBasket,
    quickLogIconTrash,
    quickLogIconPlate,
    quickLogIconBath,
    quickLogIconTeddy,
    quickLogIconCart,
    quickLogIconBox,
    quickLogIconSparkle
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

private enum class MobileCompletionCelebrationVariant {
    STANDARD,
    RARE,
    CHORE,
    PERFECT
}

private data class MobileCompletionCelebration(
    val points: Int,
    val choreTitle: String,
    val titleResource: Int,
    val eyebrowResource: Int,
    val phraseResource: Int,
    val variant: MobileCompletionCelebrationVariant
)

private data class MobileChoreAwareCelebrationGroup(
    val keywords: List<String>,
    val phraseResources: List<Int>
)

private val recurrenceWeekdayOrder = listOf(
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY"
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
    if (pool.size == 1) {
        return pool.first()
    }

    var nextResource = pool[Random.nextInt(pool.size)]
    while (nextResource == previousResource) {
        nextResource = pool[Random.nextInt(pool.size)]
    }

    return nextResource
}

private fun pickDeterministicCelebrationResource(pool: List<Int>, index: Int): Int {
    if (pool.isEmpty()) {
        return R.string.mobile_celebration_phrase_1
    }

    return pool[kotlin.math.abs(index) % pool.size]
}

private fun buildMobileCompletionCelebration(
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
    val loginFailedMessage = stringResource(R.string.mobile_login_failed)
    val photoRequiredMessage = stringResource(R.string.mobile_photo_required_missing)
    val featureApprovalsDisabledMessage = stringResource(R.string.mobile_feature_approvals_disabled)
    val featureProofUploadsDisabledMessage = stringResource(R.string.mobile_feature_proof_uploads_disabled)
    val featureTakeoverDirectDisabledMessage = stringResource(R.string.mobile_feature_takeover_direct_disabled)
    val featureTakeoverRequestsDisabledMessage = stringResource(R.string.mobile_feature_takeover_requests_disabled)
    val featureChoresManageDisabledMessage = stringResource(R.string.mobile_feature_chores_manage_disabled)
    val featureQuickLogDisabledMessage = stringResource(R.string.mobile_feature_quick_log_disabled)
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
    val quickLoggingMessage = stringResource(R.string.mobile_quick_log_saving)
    val updatingDueAtMessage = stringResource(R.string.mobile_updating_due_at)
    val cancellingChoreMessage = stringResource(R.string.mobile_cancelling_chore)
    val cancellingOccurrenceMessage = stringResource(R.string.mobile_cancelling_occurrence)
    val cancellingSeriesMessage = stringResource(R.string.mobile_cancelling_series)
    val deviceRemovingMessage = stringResource(R.string.mobile_device_removing)
    val choreStartedMessage = stringResource(R.string.mobile_chore_started)
    val choreTakenOverMessage = stringResource(R.string.mobile_chore_taken_over)
    val onboardingInviteLoadedMessage = stringResource(R.string.mobile_onboarding_invite_loaded)
    val takeoverRequestSentMessage = stringResource(R.string.mobile_takeover_request_sent)
    val takeoverApprovedMessage = stringResource(R.string.mobile_takeover_request_approved_notice)
    val takeoverDeclinedMessage = stringResource(R.string.mobile_takeover_request_declined_notice)
    val createChoreFailedMessage = stringResource(R.string.mobile_create_chore_failed)
    val quickLogSuccessMessage = stringResource(R.string.mobile_quick_log_success)
    val quickLogFailedMessage = stringResource(R.string.mobile_quick_log_failed)
    val dueAtUpdatedMessage = stringResource(R.string.mobile_due_at_updated)
    val choreCancelledMessage = stringResource(R.string.mobile_chore_cancelled)
    val occurrenceCancelledMessage = stringResource(R.string.mobile_occurrence_cancelled)
    val seriesCancelledMessage = stringResource(R.string.mobile_series_cancelled)
    val deviceRemovedMessage = stringResource(R.string.mobile_device_removed)
    val reconnectFailedMessage = stringResource(R.string.mobile_connection_restore_failed)
    val cancelChoreFailedMessage = stringResource(R.string.mobile_cancel_chore_failed)
    val cancelOccurrenceFailedMessage = stringResource(R.string.mobile_cancel_occurrence_failed)
    val cancelSeriesFailedMessage = stringResource(R.string.mobile_cancel_series_failed)
    val dueAtUpdateFailedMessage = stringResource(R.string.mobile_due_at_update_failed)
    val completingExternalMessage = stringResource(R.string.mobile_completing_external)
    val completeExternalSuccessMessage = stringResource(R.string.mobile_complete_external_success)
    val completeExternalFailedMessage = stringResource(R.string.mobile_complete_external_failed)
    var session by remember { mutableStateOf(sessionStore.readSession()) }
    var themeMode by remember { mutableStateOf(appPreferencesStore.readThemeMode()) }
    var languageTag by remember { mutableStateOf(appPreferencesStore.readLanguageTag()) }
    var mobileAvatarKey by remember { mutableStateOf(appPreferencesStore.readMobileAvatarKey()) }
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
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var registrationDisplayName by remember { mutableStateOf("") }
    var registrationEmail by remember { mutableStateOf("") }
    var registrationPassword by remember { mutableStateOf("") }
    var onboardingDeepLink by remember { mutableStateOf<MobileOnboardingDeepLink?>(null) }
    var onboardingInvite by remember { mutableStateOf<MobileResolvedInvite?>(null) }
    var authProviders by remember { mutableStateOf<MobileAuthProviders?>(null) }
    var authProvidersCheckedBaseUrl by remember { mutableStateOf<String?>(null) }
    var isAuthProvidersLoading by remember { mutableStateOf(false) }
    var authProvidersErrorMessage by remember { mutableStateOf<String?>(null) }
    var hostedEnrollmentConfig by remember { mutableStateOf<MobilePublicEnrollmentSiteConfig?>(null) }
    val initialCachedDashboard = remember {
        if (session.token == null) null else dashboardCacheStore.read(session.baseUrl)?.dashboard
    }
    var dashboard by remember { mutableStateOf<MobileDashboard?>(initialCachedDashboard) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var noticeMessage by remember { mutableStateOf<String?>(null) }
    var serverReleaseInfo by remember { mutableStateOf<MobileReleaseInfo?>(null) }
    var hostedSubscription by remember { mutableStateOf(MobileHostedSubscriptionOverview()) }
    var notificationDevices by remember { mutableStateOf<List<MobileNotificationDevice>>(emptyList()) }
    var dismissedUpdateKey by remember { mutableStateOf(sessionStore.readDismissedUpdateKey()) }
    var githubReleaseInfo by remember { mutableStateOf<GitHubReleaseInfo?>(null) }
    var githubCheckDone by remember { mutableStateOf(false) }
    var githubCheckError by remember { mutableStateOf(false) }
    var dismissedGithubVersion by remember { mutableStateOf(sessionStore.readDismissedGithubVersion()) }
    var isDownloadingUpdate by remember { mutableStateOf(false) }
    var downloadProgress by remember { mutableStateOf(0f) }
    var downloadError by remember { mutableStateOf(false) }
    var isBusy by remember { mutableStateOf(session.token != null) }
    var refreshQueued by remember { mutableStateOf(false) }
    var isSyncingQueue by remember { mutableStateOf(false) }
    var activeReviewAction by remember { mutableStateOf<String?>(null) }
    var activeNotificationAction by remember { mutableStateOf<String?>(null) }
    var activeStartAction by remember { mutableStateOf<String?>(null) }
    var activeSubmitAction by remember { mutableStateOf<String?>(null) }
    var activeCloseCycleAction by remember { mutableStateOf<String?>(null) }
    var activeCancelChoreAction by remember { mutableStateOf<String?>(null) }
    var activeExternalCompleteAction by remember { mutableStateOf<String?>(null) }
    var activeTakeoverRequestAction by remember { mutableStateOf<String?>(null) }
    var activeCreateAction by remember { mutableStateOf<String?>(null) }
    var activeQuickLogAction by remember { mutableStateOf<String?>(null) }
    var activeDueAtAction by remember { mutableStateOf<String?>(null) }
    var createSuccessCounter by remember { mutableIntStateOf(0) }
    var activeDeviceAction by remember { mutableStateOf<String?>(null) }
    var isDashboardSyncConnected by remember { mutableStateOf(true) }
    var showDashboardSyncNotice by remember { mutableStateOf(false) }
    var syncNoticeGraceUntilEpochMillis by remember {
        mutableLongStateOf(
            if (session.token != null) System.currentTimeMillis() + syncStartupNoticeGraceMs else 0L
        )
    }
    var pendingReconnectActionLabel by remember { mutableStateOf<String?>(null) }
    var validationDialogMessage by remember { mutableStateOf<String?>(null) }
    var submitSelections by remember { mutableStateOf<Map<String, Set<String>>>(emptyMap()) }
    var selectedProofUris by remember { mutableStateOf<Map<String, List<String>>>(emptyMap()) }
    var pendingPhotoPickerChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureChoreId by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureUriString by remember { mutableStateOf<String?>(null) }
    var pendingPhotoCaptureFilePath by remember { mutableStateOf<String?>(null) }
    var pendingSettingsLogExportContent by remember { mutableStateOf<String?>(null) }
    var queuedSubmissionCount by remember { mutableIntStateOf(0) }
    val hasSyncFailureContext =
        !pendingReconnectActionLabel.isNullOrBlank() || queuedSubmissionCount > 0
    var completionCelebration by remember { mutableStateOf<MobileCompletionCelebration?>(null) }
    var lastCompletionCelebrationPhraseResource by remember { mutableIntStateOf(0) }
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

    val avatarImagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) {
            return@rememberLauncherForActivityResult
        }
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

    val settingsLogExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/plain")
    ) { uri ->
        val exportContent = pendingSettingsLogExportContent
        pendingSettingsLogExportContent = null
        if (uri == null || exportContent.isNullOrBlank()) {
            return@rememberLauncherForActivityResult
        }

        runCatching {
            context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
                writer.write(exportContent)
            } ?: throw IllegalStateException("Unable to open the selected destination.")
        }.onSuccess {
            noticeMessage = context.getString(R.string.mobile_settings_logs_saved)
        }.onFailure { throwable ->
            errorMessage = throwable.message
        }
    }

    LaunchedEffect(session.token) {
        if (session.token != null) {
            syncNoticeGraceUntilEpochMillis = System.currentTimeMillis() + syncStartupNoticeGraceMs
        } else {
            syncNoticeGraceUntilEpochMillis = 0L
        }
        showDashboardSyncNotice = false
    }

    LaunchedEffect(
        isDashboardSyncConnected,
        session.token,
        syncNoticeGraceUntilEpochMillis,
        hasSyncFailureContext
    ) {
        if (session.token == null) {
            showDashboardSyncNotice = false
            return@LaunchedEffect
        }

        if (isDashboardSyncConnected || !hasSyncFailureContext) {
            showDashboardSyncNotice = false
        } else {
            val now = System.currentTimeMillis()
            val startupGraceRemainingMs = (syncNoticeGraceUntilEpochMillis - now).coerceAtLeast(0L)
            if (startupGraceRemainingMs > 0L) {
                delay(startupGraceRemainingMs)
            }
            delay(syncDisconnectNoticeDelayMs)
            if (session.token != null && !isDashboardSyncConnected && hasSyncFailureContext) {
                showDashboardSyncNotice = true
            }
        }
    }

    fun normalizedServerUrl() = serverUrl.trim().ifBlank { defaultApiBaseUrl }

    fun hasFeatureAccess(check: (MobileFeatureAccess) -> Boolean): Boolean {
        return check(dashboard?.user?.featureAccess ?: MobileFeatureAccess())
    }

    fun resolveLoginScreenErrorMessage(throwable: Throwable): String {
        return throwable.message ?: loginFailedMessage
    }

    fun buildSettingsLogReport(): String {
        val generatedAt = Instant.now().toString()
        val currentDevice = notificationDevices.firstOrNull { it.installationId == installationId }
        val lines = mutableListOf<String>()
        lines += "TaskBandit Android Settings Log Export"
        lines += "GeneratedAt=$generatedAt"
        lines += "AppRelease=${formatReleaseLabel(currentReleaseInfo)}"
        lines += "AppCommit=${BuildConfig.TASKBANDIT_COMMIT_SHA}"
        lines += "ServerRelease=${serverReleaseInfo?.let(::formatReleaseLabel) ?: "unknown"}"
        lines += "ServerUrl=${normalizedServerUrl()}"
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

    fun downloadSettingsLogs() {
        val safeTimestamp = Instant.now().toString().replace(":", "-")
        pendingSettingsLogExportContent = buildSettingsLogReport()
        settingsLogExportLauncher.launch("taskbandit-settings-$safeTimestamp.txt")
    }

    fun clearAuthProviderState() {
        authProviders = null
        authProvidersCheckedBaseUrl = null
        authProvidersErrorMessage = null
        isAuthProvidersLoading = false
        hostedEnrollmentConfig = null
    }

    fun hasFreshAuthProviderState(baseUrl: String) = authProvidersCheckedBaseUrl == baseUrl

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

    fun logout() {
        val baseUrl = normalizedServerUrl()
        sessionStore.clearToken(baseUrl)
        dashboardCacheStore.clear()
        widgetStore.clear()
        TaskBanditWidgetProvider.refreshAllWidgets(context)
        session = TaskBanditSession(baseUrl = baseUrl, token = null)
        serverUrl = baseUrl
        dashboard = null
        hostedSubscription = MobileHostedSubscriptionOverview()
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
        completionCelebration = null
        registrationDisplayName = ""
        registrationEmail = ""
        registrationPassword = ""
        clearAuthProviderState()
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

    fun checkForGithubUpdates() {
        githubCheckDone = false
        githubCheckError = false
        coroutineScope.launch {
            val result = runCatching { withContext(Dispatchers.IO) { fetchGitHubLatestRelease() } }
            githubReleaseInfo = result.getOrNull()
            // Only flag an error on an actual exception — a null result just means
            // no android-v* release was found yet, which is a valid "not found" state.
            githubCheckError = result.isFailure
            githubCheckDone = true
        }
    }

    fun refreshDashboard() {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        isBusy = true
        refreshQueued = false
        errorMessage = null

        coroutineScope.launch {
            val githubResult = runCatching { withContext(Dispatchers.IO) { fetchGitHubLatestRelease() } }
            githubReleaseInfo = githubResult.getOrNull()
            githubCheckError = githubResult.isFailure
            githubCheckDone = true
        }

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
                    ?.trim()
                    ?.ifBlank { null }
                val resolvedBaseUrl = canonicalApiBaseUrl ?: baseUrl
                dashboard = loadedPayload.dashboard
                hostedSubscription = loadedPayload.hostedSubscription
                serverReleaseInfo = loadedPayload.latestReleaseInfo
                notificationDevices = loadedPayload.notificationDevices
                serverUrl = resolvedBaseUrl
                sessionStore.saveSession(resolvedBaseUrl, token)
                session = TaskBanditSession(baseUrl = resolvedBaseUrl, token = token)
                dashboardCacheStore.save(resolvedBaseUrl, loadedPayload.dashboard)
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
        if (!hasFeatureAccess { it.approvals }) {
            noticeMessage = featureApprovalsDisabledMessage
            return
        }
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
            }.onSuccess { reviewedChore ->
                if (reviewedChore.completionMilestone?.type == "perfect_day") {
                    val celebration = buildMobileCompletionCelebration(
                        reviewedChore,
                        lastCompletionCelebrationPhraseResource
                    )
                    completionCelebration = celebration
                    lastCompletionCelebrationPhraseResource = celebration.phraseResource
                }
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
        if (!hasFeatureAccess { it.proofUploads }) {
            noticeMessage = featureProofUploadsDisabledMessage
            return
        }
        pendingPhotoPickerChoreId = choreId
        proofPicker.launch(arrayOf("image/*"))
    }

    fun takeProofPhoto(choreId: String) {
        if (!hasFeatureAccess { it.proofUploads }) {
            noticeMessage = featureProofUploadsDisabledMessage
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
        if (!hasFeatureAccess { it.takeoverDirect }) {
            noticeMessage = featureTakeoverDirectDisabledMessage
            return
        }
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
        if (!hasFeatureAccess { it.takeoverRequests }) {
            noticeMessage = featureTakeoverRequestsDisabledMessage
            return
        }
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
        if (!hasFeatureAccess { it.takeoverRequests }) {
            noticeMessage = featureTakeoverRequestsDisabledMessage
            return
        }
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

        if (chore.requirePhotoProof && proofUriStrings.isEmpty()) {
            validationDialogMessage = photoRequiredMessage
            return
        }
        if (chore.requirePhotoProof && !hasFeatureAccess { it.proofUploads }) {
            validationDialogMessage = featureProofUploadsDisabledMessage
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
                val submittedChore = withContext(Dispatchers.IO) {
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
                if (submittedChore.state == "completed") {
                    val celebration = buildMobileCompletionCelebration(
                        submittedChore,
                        lastCompletionCelebrationPhraseResource
                    )
                    completionCelebration = celebration
                    lastCompletionCelebrationPhraseResource = celebration.phraseResource
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
        recurrenceWeekdays: List<String>,
        recurrenceEndMode: String?,
        recurrenceOccurrences: Int?,
        recurrenceEndsAtIsoUtc: String?,
        variantId: String? = null
    ) {
        if (!hasFeatureAccess { it.choresManage }) {
            noticeMessage = featureChoresManageDisabledMessage
            return
        }
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        val canUseReassignment = hasFeatureAccess { it.reassignment }
        val sanitizedAssigneeId = if (canUseReassignment) assigneeId else null
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

    fun quickLog(
        instanceId: String?,
        templateId: String?,
        title: String?,
        note: String?,
        createTemplateFromEntry: Boolean,
        pointsOverride: Int?
    ) {
        val role = dashboard?.user?.role
        if (role != "admin" && role != "parent") {
            noticeMessage = featureQuickLogDisabledMessage
            return
        }
        if (!hasFeatureAccess { it.quickLog }) {
            noticeMessage = featureQuickLogDisabledMessage
            return
        }

        val normalizedTitle = title?.trim().orEmpty()
        if (instanceId.isNullOrBlank() && templateId.isNullOrBlank() && normalizedTitle.isBlank()) {
            validationDialogMessage = context.getString(R.string.mobile_quick_log_require_input)
            return
        }

        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeQuickLogAction = "quick-log"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(quickLoggingMessage) {
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
                dashboard = dashboard?.copy(
                    chores = buildList {
                        val existing = dashboard?.chores.orEmpty()
                        var replaced = false
                        existing.forEach { chore ->
                            if (chore.id == loggedChore.id) {
                                add(loggedChore)
                                replaced = true
                            } else {
                                add(chore)
                            }
                        }
                        if (!replaced) {
                            add(0, loggedChore)
                        }
                    }
                )
                noticeMessage = quickLogSuccessMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: quickLogFailedMessage
                }
            }
            activeQuickLogAction = null
        }
    }

    fun updateChoreDueAt(choreId: String, dueAtIsoUtc: String, title: String, variantId: String?) {
        if (!hasFeatureAccess { it.choresManage }) {
            noticeMessage = featureChoresManageDisabledMessage
            return
        }

        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        val chore = dashboard?.chores?.firstOrNull { it.id == choreId } ?: return
        activeDueAtAction = "update-due:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(updatingDueAtMessage) {
                        api.updateChoreDueAt(baseUrl, token, chore, dueAtIsoUtc, title, variantId)
                    }
                }
            }.onSuccess { updatedChore ->
                dashboard = dashboard?.copy(
                    chores = dashboard?.chores.orEmpty().map { existing ->
                        if (existing.id == choreId) updatedChore else existing
                    }
                )
                noticeMessage = dueAtUpdatedMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: dueAtUpdateFailedMessage
                }
            }
            activeDueAtAction = null
        }
    }

    fun cancelChore(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeCancelChoreAction = "cancel:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(cancellingChoreMessage) {
                        api.cancelChore(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = choreCancelledMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: cancelChoreFailedMessage
                }
            }
            activeCancelChoreAction = null
        }
    }

    fun closeChoreCycle(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeCloseCycleAction = "cancel-series:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(cancellingSeriesMessage) {
                        api.cancelChoreSeries(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = seriesCancelledMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: cancelSeriesFailedMessage
                }
            }
            activeCloseCycleAction = null
        }
    }

    fun cancelChoreOccurrence(choreId: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeCloseCycleAction = "cancel-occurrence:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(cancellingOccurrenceMessage) {
                        api.cancelChoreOccurrence(baseUrl, token, choreId)
                    }
                }
            }.onSuccess {
                noticeMessage = occurrenceCancelledMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: cancelOccurrenceFailedMessage
                }
            }
            activeCloseCycleAction = null
        }
    }

    fun completeChoreExternally(choreId: String, externalCompleterName: String) {
        val token = session.token ?: return
        val baseUrl = normalizedServerUrl()
        activeExternalCompleteAction = "complete-external:$choreId"
        errorMessage = null
        noticeMessage = null

        coroutineScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    runMutationWithReconnectWindow(completingExternalMessage) {
                        api.completeExternalChore(baseUrl, token, choreId, externalCompleterName)
                    }
                }
            }.onSuccess {
                noticeMessage = completeExternalSuccessMessage
                requestDashboardRefresh()
            }.onFailure { throwable ->
                if (throwable is TaskBanditUnauthorizedException) {
                    logout()
                } else {
                    errorMessage = throwable.message ?: completeExternalFailedMessage
                }
            }
            activeExternalCompleteAction = null
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
            dashboardCacheStore.read(session.baseUrl)?.dashboard?.let { cachedDashboard ->
                dashboard = cachedDashboard
            }
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

        runCatching {
            dashboardSyncClient.connect(activeBaseUrl, token).collect { signal ->
                when (signal) {
                    MobileDashboardSyncSignal.Connected -> isDashboardSyncConnected = true
                    MobileDashboardSyncSignal.Disconnected -> isDashboardSyncConnected = false
                    MobileDashboardSyncSignal.RefreshRequested -> requestDashboardRefresh()
                    MobileDashboardSyncSignal.Unauthorized -> logout()
                }
            }
        }.onFailure {
            isDashboardSyncConnected = false
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

    LaunchedEffect(session.token) {
        if (session.token != null) {
            return@LaunchedEffect
        }

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
            noticeMessage = onboardingInviteLoadedMessage
            errorMessage = null
        }.onFailure { throwable ->
            deepLink.tenantApiUrl
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?.let { fallbackApiUrl ->
                    serverUrl = fallbackApiUrl
                    sessionStore.saveBaseUrl(fallbackApiUrl)
                }
            errorMessage = resolveLoginScreenErrorMessage(throwable)
        }
    }

    LaunchedEffect(pendingOidcResult.value) {
        val oidcResult = pendingOidcResult.value ?: return@LaunchedEffect
        pendingOidcResult.value = null

        when {
            !oidcResult.accessToken.isNullOrBlank() -> {
                val baseUrl = normalizedServerUrl()
                dashboardCacheStore.clear()
                dashboard = null
                serverUrl = baseUrl
                sessionStore.saveSession(baseUrl, oidcResult.accessToken)
                session = TaskBanditSession(baseUrl = baseUrl, token = oidcResult.accessToken)
                errorMessage = null
                noticeMessage = null
            }
            !oidcResult.errorMessage.isNullOrBlank() -> {
                errorMessage = oidcResult.errorMessage
            }
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
    val visibleGithubUpdate = githubReleaseInfo?.takeIf { info ->
        githubCheckDone &&
            compareReleaseVersions(BuildConfig.TASKBANDIT_RELEASE_VERSION, info.version) < 0 &&
            info.version != dismissedGithubVersion
    }
    fun dismissUpdateNotice() {
        val updateKey = availableUpdateKey ?: return
        sessionStore.saveDismissedUpdateKey(updateKey)
        dismissedUpdateKey = updateKey
    }
    fun dismissGithubUpdate() {
        val version = githubReleaseInfo?.version ?: return
        sessionStore.saveDismissedGithubVersion(version)
        dismissedGithubVersion = version
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
                    isBusy = isBusy,
                    errorMessage = errorMessage,
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
                    onCheckSignInMethods = {
                        refreshAuthProviders()
                    },
                    onOidcLogin = {
                        val baseUrl = normalizedServerUrl()
                        errorMessage = null
                        runCatching {
                            val resolvedLanguageTag =
                                if (languageTag == "system") Locale.getDefault().toLanguageTag() else languageTag
                            val oidcIntent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse(api.getOidcStartUrl(baseUrl, resolvedLanguageTag, androidOidcCallbackUrl))
                            )
                            context.startActivity(oidcIntent)
                        }.onFailure { throwable ->
                            errorMessage = resolveLoginScreenErrorMessage(throwable)
                        }
                    },
                    onLogin = {
                        isBusy = true
                        errorMessage = null
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
                                dashboard = null
                                serverUrl = effectiveBaseUrl
                                sessionStore.saveSession(effectiveBaseUrl, loginResult.accessToken)
                                session = TaskBanditSession(baseUrl = effectiveBaseUrl, token = loginResult.accessToken)
                                noticeMessage = null
                            }.onFailure { throwable ->
                                errorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            isBusy = false
                        }
                    },
                    onLocalSignup = {
                        val baseUrl = normalizedServerUrl()
                        val signupRequest = MobileSignupRequest(
                            displayName = registrationDisplayName,
                            email = registrationEmail,
                            password = registrationPassword
                        )
                        isBusy = true
                        errorMessage = null
                        coroutineScope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    api.signup(baseUrl, signupRequest)
                                }
                            }.onSuccess { signupResult ->
                                val canonicalApiBaseUrl = signupResult.tenantContext?.canonicalApiBaseUrl
                                    ?.trim()
                                    ?.ifBlank { null }
                                val effectiveBaseUrl = canonicalApiBaseUrl ?: baseUrl
                                dashboardCacheStore.clear()
                                dashboard = null
                                serverUrl = effectiveBaseUrl
                                sessionStore.saveSession(effectiveBaseUrl, signupResult.accessToken)
                                session = TaskBanditSession(
                                    baseUrl = effectiveBaseUrl,
                                    token = signupResult.accessToken
                                )
                                registrationDisplayName = ""
                                registrationEmail = ""
                                registrationPassword = ""
                                noticeMessage = context.getString(R.string.mobile_signup_success)
                            }.onFailure { throwable ->
                                errorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            isBusy = false
                        }
                    },
                    onHostedSignup = {
                        val baseUrl = normalizedServerUrl()
                        val signupRequest = MobileSignupRequest(
                            displayName = registrationDisplayName,
                            email = registrationEmail,
                            password = registrationPassword
                        )
                        isBusy = true
                        errorMessage = null
                        coroutineScope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    val config = hostedEnrollmentConfig ?: api.getPublicEnrollmentSiteConfig(baseUrl)
                                    val enrollmentStartResult =
                                        if (config?.publicEnrollmentEnabled == true) {
                                            runCatching {
                                                api.startHostedEnrollment(
                                                    baseUrl = baseUrl,
                                                    request = signupRequest,
                                                    languageTag = if (languageTag == "system") Locale.getDefault().toLanguageTag() else languageTag,
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
                                    errorMessage = context.getString(R.string.mobile_signup_hosted_unavailable)
                                } else {
                                    runCatching {
                                        val hostedSignupIntent = Intent(Intent.ACTION_VIEW, Uri.parse(handoffUrl))
                                        context.startActivity(hostedSignupIntent)
                                    }.onSuccess {
                                        noticeMessage = context.getString(R.string.mobile_signup_hosted_continue_notice)
                                    }.onFailure { throwable ->
                                        errorMessage = resolveLoginScreenErrorMessage(throwable)
                                    }
                                }
                            }.onFailure { throwable ->
                                errorMessage = resolveLoginScreenErrorMessage(throwable)
                            }
                            isBusy = false
                        }
                    }
                )
            } else {
                DashboardScreen(
                    dashboard = dashboard,
                    hostedSubscription = hostedSubscription,
                    serverUrl = serverUrl,
                    currentReleaseLabel = currentReleaseLabel,
                    serverReleaseLabel = serverReleaseLabel,
                    availableUpdate = visibleUpdate,
                    notificationDevices = notificationDevices,
                    installationId = installationId,
                    languageTag = languageTag,
                    themeMode = themeMode,
                    mobileAvatarKey = mobileAvatarKey,
                    notificationsPermissionGranted = notificationsPermissionGranted,
                    isBusy = isBusy,
                    showDashboardSyncNotice = showDashboardSyncNotice,
                    isSyncingQueue = isSyncingQueue,
                    activeReviewAction = activeReviewAction,
                    activeStartAction = activeStartAction,
                    activeSubmitAction = activeSubmitAction,
                    activeCloseCycleAction = activeCloseCycleAction,
                    activeCancelChoreAction = activeCancelChoreAction,
                    activeExternalCompleteAction = activeExternalCompleteAction,
                    activeDueAtAction = activeDueAtAction,
                    activeTakeoverRequestAction = activeTakeoverRequestAction,
                    activeCreateAction = activeCreateAction,
                    activeQuickLogAction = activeQuickLogAction,
                    createSuccessCounter = createSuccessCounter,
                    activeDeviceAction = activeDeviceAction,
                    errorMessage = errorMessage,
                    noticeMessage = noticeMessage,
                    pendingReconnectActionLabel = pendingReconnectActionLabel,
                    validationDialogMessage = validationDialogMessage,
                    completionCelebration = completionCelebration,
                    queuedSubmissionCount = queuedSubmissionCount,
                    onDismissValidationDialog = { validationDialogMessage = null },
                    onDismissCompletionCelebration = { completionCelebration = null },
                    onDismissUpdate = ::dismissUpdateNotice,
                    visibleGithubUpdate = visibleGithubUpdate,
                    githubCheckDone = githubCheckDone,
                    githubCheckError = githubCheckError,
                    githubLatestVersion = githubReleaseInfo?.version,
                    isDownloadingUpdate = isDownloadingUpdate,
                    downloadProgress = downloadProgress,
                    downloadError = downloadError,
                    onCheckForUpdates = ::checkForGithubUpdates,
                    onDismissGithubUpdate = ::dismissGithubUpdate,
                    onDownloadAndInstall = { info ->
                        isDownloadingUpdate = true
                        downloadProgress = 0f
                        downloadError = false
                        coroutineScope.launch(Dispatchers.IO) {
                            downloadAndInstallApk(
                                context = context,
                                url = info.apkDownloadUrl,
                                version = info.version,
                                onProgress = { p -> downloadProgress = p },
                                onDone = { isDownloadingUpdate = false },
                                onError = { isDownloadingUpdate = false; downloadError = true }
                            )
                        }
                    },
                    onRefresh = ::requestDashboardRefresh,
                    onDownloadSettingsLogs = ::downloadSettingsLogs,
                    onLogout = ::logout,
                    onApprove = { instanceId -> reviewPendingChore(instanceId, true) },
                    onReject = { instanceId -> reviewPendingChore(instanceId, false) },
                    onToggleChecklistItem = ::toggleChecklistItem,
                    submitSelections = submitSelections,
                    selectedProofUris = selectedProofUris,
                    onPickProofs = ::openProofPicker,
                    onTakeProofPhoto = ::takeProofPhoto,
                    onStartChore = ::startChore,
                    onCancelChoreOccurrence = ::cancelChoreOccurrence,
                    onCloseChoreCycle = ::closeChoreCycle,
                    onCancelChore = ::cancelChore,
                    onCompleteExternalChore = ::completeChoreExternally,
                    onEditChoreDueAt = ::updateChoreDueAt,
                    onTakeOverChore = ::takeOverChore,
                    onRequestTakeover = ::requestTakeover,
                    onRespondToTakeoverRequest = ::respondToTakeoverRequest,
                    onSubmitChore = ::submitChore,
                    onCreateChore = ::createChore,
                    onQuickLog = ::quickLog,
                    onRemoveNotificationDevice = ::removeNotificationDevice,
                    onThemeModeChange = ::updateThemeMode,
                    onLanguageTagChange = ::updateLanguageTag,
                    onAvatarPresetSelect = { avatarKey ->
                        mobileAvatarKey = avatarKey
                        appPreferencesStore.saveMobileAvatarKey(avatarKey)
                    },
                    onAvatarUpload = {
                        avatarImagePicker.launch(arrayOf("image/*"))
                    },
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
    authProviders: MobileAuthProviders?,
    hostedEnrollmentConfig: MobilePublicEnrollmentSiteConfig?,
    authProvidersCheckedBaseUrl: String?,
    isAuthProvidersLoading: Boolean,
    authProvidersErrorMessage: String?,
    email: String,
    password: String,
    registrationDisplayName: String,
    registrationEmail: String,
    registrationPassword: String,
    isBusy: Boolean,
    errorMessage: String?,
    onboardingHint: String?,
    onServerUrlChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegistrationDisplayNameChange: (String) -> Unit,
    onRegistrationEmailChange: (String) -> Unit,
    onRegistrationPasswordChange: (String) -> Unit,
    onCheckSignInMethods: () -> Unit,
    onOidcLogin: () -> Unit,
    onLogin: () -> Unit,
    onLocalSignup: () -> Unit,
    onHostedSignup: () -> Unit
) {
    val emailFocusRequester = remember { FocusRequester() }
    val passwordFocusRequester = remember { FocusRequester() }
    var showSelfHostedSetup by rememberSaveable { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val normalizedServerUrl = serverUrl.trim().ifBlank { defaultApiBaseUrl }
    val hasCheckedCurrentServer = authProvidersCheckedBaseUrl == normalizedServerUrl
    val showProviderStatus = hasCheckedCurrentServer || isAuthProvidersLoading || !authProvidersErrorMessage.isNullOrBlank()
    val showLocalLogin = when {
        authProviders?.local?.enabled == true -> true
        !hasCheckedCurrentServer && authProvidersErrorMessage.isNullOrBlank() && !isAuthProvidersLoading -> false
        else -> authProvidersErrorMessage != null || authProviders == null
    }
    val showOidcLogin = authProviders?.oidc?.enabled == true
    val showLocalSignupAction = authProviders?.local?.enabled == true && authProviders.local.selfSignupEnabled
    val showHostedSignupAction = !showSelfHostedSetup && !showLocalSignupAction && (
        hostedEnrollmentConfig?.publicEnrollmentEnabled == true || normalizedServerUrl == defaultApiBaseUrl
    )

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
                    }
                    Column(
                        modifier = Modifier.weight(1.15f),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        LoginMethodsForm(
                            serverUrl = serverUrl,
                            email = email,
                            password = password,
                            isBusy = isBusy,
                            errorMessage = errorMessage,
                            onboardingHint = onboardingHint,
                            authProviders = authProviders,
                            showProviderStatus = showProviderStatus,
                            showLocalLogin = showLocalLogin,
                            showOidcLogin = showOidcLogin,
                            isAuthProvidersLoading = isAuthProvidersLoading,
                            authProvidersErrorMessage = authProvidersErrorMessage,
                            emailFocusRequester = emailFocusRequester,
                            passwordFocusRequester = passwordFocusRequester,
                            focusManagerClear = { focusManager.clearFocus() },
                            onServerUrlChange = onServerUrlChange,
                            onEmailChange = onEmailChange,
                            onPasswordChange = onPasswordChange,
                            registrationDisplayName = registrationDisplayName,
                            registrationEmail = registrationEmail,
                            registrationPassword = registrationPassword,
                            onRegistrationDisplayNameChange = onRegistrationDisplayNameChange,
                            onRegistrationEmailChange = onRegistrationEmailChange,
                            onRegistrationPasswordChange = onRegistrationPasswordChange,
                            onCheckSignInMethods = onCheckSignInMethods,
                            onOidcLogin = onOidcLogin,
                            onLogin = onLogin,
                            onLocalSignup = onLocalSignup,
                            onHostedSignup = onHostedSignup,
                            showLocalSignupAction = showLocalSignupAction,
                            showHostedSignupAction = showHostedSignupAction,
                            showSelfHostedSetup = showSelfHostedSetup,
                            onToggleSelfHostedSetup = { showSelfHostedSetup = it }
                        )
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
                    LoginMethodsForm(
                        serverUrl = serverUrl,
                        email = email,
                        password = password,
                        isBusy = isBusy,
                        errorMessage = errorMessage,
                        onboardingHint = onboardingHint,
                        authProviders = authProviders,
                        showProviderStatus = showProviderStatus,
                        showLocalLogin = showLocalLogin,
                        showOidcLogin = showOidcLogin,
                        isAuthProvidersLoading = isAuthProvidersLoading,
                        authProvidersErrorMessage = authProvidersErrorMessage,
                        emailFocusRequester = emailFocusRequester,
                        passwordFocusRequester = passwordFocusRequester,
                        focusManagerClear = { focusManager.clearFocus() },
                        onServerUrlChange = onServerUrlChange,
                        onEmailChange = onEmailChange,
                        onPasswordChange = onPasswordChange,
                        registrationDisplayName = registrationDisplayName,
                        registrationEmail = registrationEmail,
                        registrationPassword = registrationPassword,
                        onRegistrationDisplayNameChange = onRegistrationDisplayNameChange,
                        onRegistrationEmailChange = onRegistrationEmailChange,
                        onRegistrationPasswordChange = onRegistrationPasswordChange,
                        onCheckSignInMethods = onCheckSignInMethods,
                        onOidcLogin = onOidcLogin,
                        onLogin = onLogin,
                        onLocalSignup = onLocalSignup,
                        onHostedSignup = onHostedSignup,
                        showLocalSignupAction = showLocalSignupAction,
                        showHostedSignupAction = showHostedSignupAction,
                        showSelfHostedSetup = showSelfHostedSetup,
                        onToggleSelfHostedSetup = { showSelfHostedSetup = it }
                    )
                }
            }
        }
    }
}

@Composable
private fun LoginMethodsForm(
    serverUrl: String,
    email: String,
    password: String,
    registrationDisplayName: String,
    registrationEmail: String,
    registrationPassword: String,
    isBusy: Boolean,
    errorMessage: String?,
    onboardingHint: String?,
    authProviders: MobileAuthProviders?,
    showProviderStatus: Boolean,
    showLocalLogin: Boolean,
    showOidcLogin: Boolean,
    isAuthProvidersLoading: Boolean,
    authProvidersErrorMessage: String?,
    emailFocusRequester: FocusRequester,
    passwordFocusRequester: FocusRequester,
    focusManagerClear: () -> Unit,
    onServerUrlChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegistrationDisplayNameChange: (String) -> Unit,
    onRegistrationEmailChange: (String) -> Unit,
    onRegistrationPasswordChange: (String) -> Unit,
    onCheckSignInMethods: () -> Unit,
    onOidcLogin: () -> Unit,
    onLogin: () -> Unit,
    onLocalSignup: () -> Unit,
    onHostedSignup: () -> Unit,
    showLocalSignupAction: Boolean,
    showHostedSignupAction: Boolean,
    showSelfHostedSetup: Boolean,
    onToggleSelfHostedSetup: (Boolean) -> Unit
) {
    val localAuthEnabled = authProviders?.local?.enabled == true
    val oidcAuthEnabled = authProviders?.oidc?.enabled == true
    val hostedCredentialFallback = !showSelfHostedSetup && !localAuthEnabled && !oidcAuthEnabled
    val showLocalLoginControls = showLocalLogin || hostedCredentialFallback
    val registrationFieldsValid =
        registrationDisplayName.trim().isNotBlank() &&
            registrationEmail.trim().isNotBlank() &&
            registrationPassword.length >= 8
    val registrationAvailable = showLocalSignupAction || showHostedSignupAction
    var authFormMode by rememberSaveable { mutableStateOf("login") }
    val noSupportedMethodsMessage =
        if (hostedCredentialFallback) {
            stringResource(R.string.mobile_auth_methods_cloud_login_ready)
        } else if (showSelfHostedSetup) {
            stringResource(R.string.mobile_auth_methods_unavailable)
        } else {
            stringResource(R.string.mobile_auth_methods_tenant_not_ready)
        }

    if (showSelfHostedSetup) {
        OutlinedTextField(
            value = serverUrl,
            onValueChange = onServerUrlChange,
            label = { Text(stringResource(R.string.mobile_server_url)) },
            supportingText = { Text(stringResource(R.string.mobile_server_url_hint)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(
                onNext = {
                    onCheckSignInMethods()
                    if (showLocalLogin) {
                        emailFocusRequester.requestFocus()
                    } else {
                        focusManagerClear()
                    }
                }
            ),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedButton(
            onClick = onCheckSignInMethods,
            enabled = !isBusy && !isAuthProvidersLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_auth_methods_check_action))
        }
    } else {
        LaunchedEffect(Unit) {
            if (serverUrl.trim() != defaultApiBaseUrl) {
                onServerUrlChange(defaultApiBaseUrl)
            }
        }
    }
    if (showProviderStatus) {
        Text(
            text = when {
                isAuthProvidersLoading -> stringResource(R.string.mobile_auth_methods_loading)
                !authProvidersErrorMessage.isNullOrBlank() -> authProvidersErrorMessage
                oidcAuthEnabled && localAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_local_and_sso)
                oidcAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_sso_only)
                localAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_local_only)
                else -> noSupportedMethodsMessage
            },
            color = if (!authProvidersErrorMessage.isNullOrBlank()) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            style = MaterialTheme.typography.bodySmall
        )
    } else {
        Text(
            text = stringResource(R.string.mobile_auth_methods_hint),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
    if (showLocalLoginControls && authFormMode == "login") {
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text(stringResource(R.string.mobile_email)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { passwordFocusRequester.requestFocus() }),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(emailFocusRequester)
        )
        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChange,
            label = { Text(stringResource(R.string.mobile_password)) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManagerClear()
                    onLogin()
                }
            ),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(passwordFocusRequester)
        )
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
        if (registrationAvailable) {
            TextButton(
                onClick = { authFormMode = "register" },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_local_action))
            }
        }
    }
    if (registrationAvailable && authFormMode == "register") {
        Text(
            text = stringResource(
                if (showHostedSignupAction) {
                    R.string.mobile_signup_hybrid_hint
                } else {
                    R.string.mobile_signup_local_hint
                }
            ),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedTextField(
            value = registrationDisplayName,
            onValueChange = onRegistrationDisplayNameChange,
            label = { Text(stringResource(R.string.mobile_signup_display_name)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = registrationEmail,
            onValueChange = onRegistrationEmailChange,
            label = { Text(stringResource(R.string.mobile_signup_email)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = registrationPassword,
            onValueChange = onRegistrationPasswordChange,
            label = { Text(stringResource(R.string.mobile_signup_password)) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (showHostedSignupAction) {
            OutlinedButton(
                onClick = onHostedSignup,
                enabled = !isBusy && registrationFieldsValid,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_hosted_action))
            }
        } else if (showLocalSignupAction) {
            Button(
                onClick = onLocalSignup,
                enabled = !isBusy && registrationFieldsValid,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_local_action))
            }
        }
        TextButton(
            onClick = { authFormMode = "login" },
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_login_action))
        }
    }
    if (showOidcLogin && authFormMode == "login") {
        OutlinedButton(
            onClick = onOidcLogin,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_login_sso_action))
        }
    }
    TextButton(
        onClick = {
            onToggleSelfHostedSetup(!showSelfHostedSetup)
            if (showSelfHostedSetup) {
                onServerUrlChange(defaultApiBaseUrl)
            }
        },
        enabled = !isBusy,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            stringResource(
                if (showSelfHostedSetup) {
                    R.string.mobile_self_hosted_back_to_saas
                } else {
                    R.string.mobile_self_hosted_setup_action
                }
            )
        )
    }
    if (!errorMessage.isNullOrBlank()) {
        Text(
            text = errorMessage,
            color = MaterialTheme.colorScheme.error
        )
    }
    if (!onboardingHint.isNullOrBlank()) {
        Text(
            text = onboardingHint,
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun DashboardScreen(
    dashboard: MobileDashboard?,
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
    onRequestNotificationPermission: () -> Unit
) {
    val context = LocalContext.current
    val isCreatorRole = dashboard?.user?.role == "admin" || dashboard?.user?.role == "parent"
    val featureAccess = dashboard?.user?.featureAccess ?: MobileFeatureAccess()
    val templateCreateCapabilities = resolveTemplateCreateCapabilities(featureAccess, hostedSubscription.featureAccess)
    val canManageChores = templateCreateCapabilities.canOpenCreateTab
    val canUseReassignment = featureAccess.reassignment
    val canUseTakeoverRequestsFeature = featureAccess.takeoverRequests
    val canUseQuickLog = isCreatorRole && featureAccess.quickLog
    val isNewMobileUi = true
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
    var showProfileDialog by rememberSaveable { mutableStateOf(false) }
    var activeNewUiChoreDialogId by rememberSaveable { mutableStateOf<String?>(null) }
    var showCompletedChoresSection by rememberSaveable { mutableStateOf(false) }
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

    BackHandler(
        enabled = showProfileDialog || showQuickLogDialog || activeNewUiChoreDialogId != null || activeTab != MobileDashboardTab.CHORES
    ) {
        backWithinDashboard()
    }

    CompositionLocalProvider(
        LocalMobileFeatureAccess provides featureAccess,
        LocalIsNewMobileUi provides true
    ) {
        Scaffold(
        topBar = {
            if (isNewMobileUi) {
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
            }
        },
        floatingActionButton = {
            if (isNewMobileUi && activeTab == MobileDashboardTab.CHORES && canManageChores) {
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
        },
        bottomBar = {
            if (isNewMobileUi) {
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
                            showLabel = isNewMobileUi,
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
                            showLabel = isNewMobileUi,
                            onClick = {
                                openTab(MobileDashboardTab.LEADERBOARD)
                                expandedChoreIds = emptySet()
                            }
                        )
                        MobileTabButton(
                            modifier = Modifier.weight(1f),
                            selected = activeTab == MobileDashboardTab.SETTINGS,
                            label = stringResource(R.string.mobile_tab_settings),
                            iconRes = R.drawable.mobile_nav_settings,
                            showLabel = isNewMobileUi,
                            onClick = { openTab(MobileDashboardTab.SETTINGS) }
                        )
                    }
                }
            } else {
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
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            MobileTabButton(
                                modifier = Modifier.weight(1f),
                                selected = activeTab == MobileDashboardTab.CHORES,
                                label = stringResource(R.string.mobile_tab_chores),
                                iconRes = R.drawable.mobile_nav_chores,
                                showLabel = isNewMobileUi,
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
                                showLabel = isNewMobileUi,
                                onClick = {
                                    openTab(MobileDashboardTab.LEADERBOARD)
                                    expandedChoreIds = emptySet()
                                }
                            )
                            MobileTabButton(
                                modifier = Modifier.weight(1f),
                                selected = activeTab == MobileDashboardTab.SETTINGS,
                                label = stringResource(R.string.mobile_tab_settings),
                                iconRes = R.drawable.mobile_nav_settings,
                                showLabel = isNewMobileUi,
                                onClick = { openTab(MobileDashboardTab.SETTINGS) }
                            )
                        }
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
                            if (isNewMobileUi) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f) else MaterialTheme.colorScheme.primaryContainer,
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
                        .padding(horizontal = if (isTablet) 28.dp else if (isNewMobileUi) 6.dp else 20.dp, vertical = 16.dp)
                        .then(if (isTablet) Modifier.widthIn(max = 1280.dp).align(Alignment.TopCenter) else Modifier),
                    verticalArrangement = Arrangement.spacedBy(if (isNewMobileUi) 10.dp else 16.dp)
                ) {
            if (activeTab == MobileDashboardTab.CHORES) {
                if (canUseQuickLog) {
                    item {
                        Card(
                            onClick = { showQuickLogDialog = true },
                            enabled = activeQuickLogAction == null,
                            shape = RoundedCornerShape(if (isNewMobileUi) 18.dp else 18.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isNewMobileUi) {
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.28f)
                                } else {
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.24f)
                                },
                                disabledContainerColor = if (isNewMobileUi) {
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.16f)
                                } else {
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.14f)
                                }
                            ),
                            border = BorderStroke(
                                1.dp,
                                if (isNewMobileUi) {
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.18f)
                                } else {
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.22f)
                                }
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = if (isNewMobileUi) 66.dp else 56.dp)
                                    .padding(horizontal = if (isNewMobileUi) 14.dp else 12.dp, vertical = if (isNewMobileUi) 8.dp else 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = stringResource(R.string.mobile_quick_log_card_title),
                                    style = if (isNewMobileUi) MaterialTheme.typography.titleSmall else MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Icon(
                                    imageVector = Icons.Rounded.ChevronRight,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
                if (sortedChores.isEmpty() && historicChores.isEmpty()) {
                    item { Text(text = noChoresLabel, style = MaterialTheme.typography.bodyMedium) }
                }
                if (isNewMobileUi && !isTablet) {
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
                } else if (isTablet) {
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
                                if (canUseTakeoverRequests && incomingTakeoverRequests.isNotEmpty()) {
                                    TakeoverRequestsPanel(
                                        requests = incomingTakeoverRequests,
                                        activeTakeoverRequestAction = activeTakeoverRequestAction,
                                        onApproveRequest = { requestId -> onRespondToTakeoverRequest(requestId, true) },
                                        onDeclineRequest = { requestId -> onRespondToTakeoverRequest(requestId, false) }
                                    )
                                }
                                ChoreSectionColumn(chores = myChoresOverdue, title = choresOverdueLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore, toneOverride = MobileChoreSectionTone.OVERDUE)
                                ChoreSectionColumn(chores = myChoresDueToday, title = choresDueTodayLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                                ChoreSectionColumn(chores = myChoresDueThisWeek, title = choresDueThisWeekLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                                ChoreSectionColumn(chores = myChoresDueLater, title = choresDueLaterLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                                ChoreSectionColumn(chores = unassignedChores, title = choresUnassignedLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                                ChoreSectionColumn(chores = otherChores, title = choresOthersLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
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
                    choreSection(chores = myChoresOverdue, title = choresOverdueLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore, toneOverride = MobileChoreSectionTone.OVERDUE)
                    choreSection(chores = myChoresDueToday, title = choresDueTodayLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                    choreSection(chores = myChoresDueThisWeek, title = choresDueThisWeekLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                    choreSection(chores = myChoresDueLater, title = choresDueLaterLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                    choreSection(chores = unassignedChores, title = choresUnassignedLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
                    choreSection(chores = otherChores, title = choresOthersLabel, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = canUseTakeoverRequests, expandedChoreIds = expandedChoreIds, onExpandedChange = { choreId -> expandedChoreIds = if (expandedChoreIds.contains(choreId)) expandedChoreIds - choreId else expandedChoreIds + choreId }, activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, outgoingTakeoverRequestsByChoreId = outgoingTakeoverRequestsByChoreId, submitSelections = submitSelections, selectedProofUris = selectedProofUris, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = { choreId -> startConfirmationChoreId = choreId }, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onTakeOverChore = { choreId -> takeoverConfirmationChoreId = choreId }, onRequestTakeover = { choreId -> requestTakeoverChoreId = choreId; requestTakeoverMemberId = null }, onSubmitChore = { choreId -> submitConfirmationChoreId = choreId }, activeDueAtAction = activeDueAtAction, onEditChoreDueAt = onEditChoreDueAt, templateVariantsByTemplateId = templateVariantsByTemplateId, activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
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

            if (activeTab == MobileDashboardTab.SETTINGS) {
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
                        SettingsReleaseContent(currentReleaseLabel = currentReleaseLabel, serverReleaseLabel = serverReleaseLabel, serverUrl = serverUrl, availableUpdate = availableUpdate, onDismissUpdate = onDismissUpdate, visibleGithubUpdate = visibleGithubUpdate, githubCheckDone = githubCheckDone, githubCheckError = githubCheckError, githubLatestVersion = githubLatestVersion, isDownloadingUpdate = isDownloadingUpdate, downloadProgress = downloadProgress, downloadError = downloadError, onCheckForUpdates = onCheckForUpdates, onDismissGithubUpdate = onDismissGithubUpdate, onDownloadAndInstall = onDownloadAndInstall)
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
private fun MobileTabButton(
    modifier: Modifier = Modifier,
    selected: Boolean,
    label: String,
    @DrawableRes iconRes: Int,
    showLabel: Boolean = false,
    enabled: Boolean = true,
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
    TextButton(
        modifier = modifier.semantics(mergeDescendants = true) { contentDescription = label },
        onClick = onClick,
        enabled = enabled,
        contentPadding = PaddingValues(horizontal = 1.dp, vertical = 2.dp),
        colors = ButtonDefaults.textButtonColors(contentColor = iconTint)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
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
private fun SectionIntro(title: String, body: String, compact: Boolean = false) {
    Column(verticalArrangement = Arrangement.spacedBy(if (compact) 4.dp else 6.dp)) {
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
    val isNewMobileUi = LocalIsNewMobileUi.current
    val trophyTint = when (rank) {
        1 -> Color(0xFFD4AF37)
        2 -> Color(0xFFC0C0C0)
        3 -> Color(0xFFCD7F32)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        shape = RoundedCornerShape(if (isNewMobileUi) 14.dp else 16.dp),
        color = if (isNewMobileUi) {
            MaterialTheme.colorScheme.surface
        } else {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
        },
        border = if (isNewMobileUi) BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)) else null
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

private fun LazyListScope.choreSection(
    chores: List<MobileChore>, title: String, currentUserId: String?, currentUserRole: String?, supportsTakeoverRequests: Boolean, expandedChoreIds: Set<String>, onExpandedChange: (String) -> Unit,
    activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?, activeCloseCycleAction: String?, activeCancelChoreAction: String?, activeTakeoverRequestAction: String?, outgoingTakeoverRequestsByChoreId: Map<String, MobileTakeoverRequest>, submitSelections: Map<String, Set<String>>, selectedProofUris: Map<String, List<String>>,
    onApprove: (String) -> Unit, onReject: (String) -> Unit, onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onTakeProofPhoto: (String) -> Unit, onStartChore: (String) -> Unit, onCancelChoreOccurrence: (String) -> Unit, onCloseChoreCycle: (String) -> Unit, onCancelChore: (String) -> Unit, onTakeOverChore: (String) -> Unit, onRequestTakeover: (String) -> Unit, onSubmitChore: (String) -> Unit, activeDueAtAction: String?, onEditChoreDueAt: (String, String, String, String?) -> Unit, templateVariantsByTemplateId: Map<String, List<com.taskbandit.app.mobile.MobileTemplateVariant>>, activeExternalCompleteAction: String?, onCompleteExternalChore: (String, String) -> Unit,
    toneOverride: MobileChoreSectionTone? = null
) {
    if (chores.isEmpty()) return
    val tone = toneOverride ?: when (chores.firstOrNull()?.let { resolveChoreSection(it, currentUserId) }) {
        MobileChoreSection.MINE -> MobileChoreSectionTone.MINE
        MobileChoreSection.UNASSIGNED -> MobileChoreSectionTone.UNASSIGNED
        MobileChoreSection.OTHERS -> MobileChoreSectionTone.OTHERS
        null -> MobileChoreSectionTone.UNASSIGNED
    }
    item {
        ChoreSectionPanel(title = title, count = chores.size, tone = tone) {
            chores.forEach { chore ->
                ChoreCard(chore = chore, currentUserId = currentUserId, currentUserRole = currentUserRole, supportsTakeoverRequests = supportsTakeoverRequests, expanded = expandedChoreIds.contains(chore.id), activeReviewAction = activeReviewAction, activeStartAction = activeStartAction, activeSubmitAction = activeSubmitAction, activeCloseCycleAction = activeCloseCycleAction, activeCancelChoreAction = activeCancelChoreAction, activeTakeoverRequestAction = activeTakeoverRequestAction, activeDueAtAction = activeDueAtAction, outgoingTakeoverRequest = outgoingTakeoverRequestsByChoreId[chore.id], selectedChecklistIds = submitSelections[chore.id] ?: chore.completedChecklistIds.toSet(), selectedProofCount = selectedProofUris[chore.id]?.size ?: 0, onExpandedChange = { onExpandedChange(chore.id) }, onApprove = onApprove, onReject = onReject, onToggleChecklistItem = onToggleChecklistItem, onPickProofs = onPickProofs, onTakeProofPhoto = onTakeProofPhoto, onStartChore = onStartChore, onCancelChoreOccurrence = onCancelChoreOccurrence, onCloseChoreCycle = onCloseChoreCycle, onCancelChore = onCancelChore, onEditChoreDueAt = onEditChoreDueAt, onTakeOverChore = onTakeOverChore, onRequestTakeover = onRequestTakeover, onSubmitChore = onSubmitChore, editableVariants = chore.templateId?.let { templateVariantsByTemplateId[it] }.orEmpty(), activeExternalCompleteAction = activeExternalCompleteAction, onCompleteExternalChore = onCompleteExternalChore)
            }
        }
    }
}

private fun LazyListScope.mockMobileChoreSection(
    chores: List<MobileChore>,
    title: String,
    currentUserId: String?,
    currentUserRole: String?,
    supportsTakeoverRequests: Boolean,
    expandedChoreIds: Set<String>,
    onExpandedChange: (String) -> Unit,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeCancelChoreAction: String?,
    activeTakeoverRequestAction: String?,
    outgoingTakeoverRequestsByChoreId: Map<String, MobileTakeoverRequest>,
    submitSelections: Map<String, Set<String>>,
    selectedProofUris: Map<String, List<String>>,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit,
    onPickProofs: (String) -> Unit,
    onTakeProofPhoto: (String) -> Unit,
    onStartChore: (String) -> Unit,
    onCancelChoreOccurrence: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onCancelChore: (String) -> Unit,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String) -> Unit,
    onSubmitChore: (String) -> Unit,
    activeDueAtAction: String?,
    onEditChoreDueAt: (String, String, String, String?) -> Unit,
    templateVariantsByTemplateId: Map<String, List<com.taskbandit.app.mobile.MobileTemplateVariant>>,
    activeExternalCompleteAction: String?,
    onCompleteExternalChore: (String, String) -> Unit,
    showViewAll: Boolean = false,
    viewAllLabel: String = "",
    emptyMessage: String? = null,
    sectionTitleColor: Color = Color.Unspecified
) {
    item {
        MockMobileSectionHeader(title = title, showViewAll = showViewAll, viewAllLabel = viewAllLabel, titleColor = sectionTitleColor)
    }
    if (chores.isEmpty()) {
        if (!emptyMessage.isNullOrBlank()) {
            item {
                Text(
                    text = emptyMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }
    items(chores, key = { it.id }) { chore ->
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
            activeCancelChoreAction = activeCancelChoreAction,
            activeTakeoverRequestAction = activeTakeoverRequestAction,
            activeDueAtAction = activeDueAtAction,
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
            onCancelChoreOccurrence = onCancelChoreOccurrence,
            onCloseChoreCycle = onCloseChoreCycle,
            onCancelChore = onCancelChore,
            onEditChoreDueAt = onEditChoreDueAt,
            onTakeOverChore = onTakeOverChore,
            onRequestTakeover = onRequestTakeover,
            onSubmitChore = onSubmitChore,
            editableVariants = chore.templateId?.let { templateVariantsByTemplateId[it] }.orEmpty(),
            activeExternalCompleteAction = activeExternalCompleteAction,
            onCompleteExternalChore = onCompleteExternalChore
        )
    }
}

@Composable
private fun MockMobileSectionHeader(
    title: String,
    showViewAll: Boolean,
    viewAllLabel: String,
    titleColor: Color = Color.Unspecified
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            color = if (titleColor != Color.Unspecified) titleColor else MaterialTheme.colorScheme.onBackground
        )
        if (showViewAll) {
            TextButton(onClick = { }) {
                Text(
                    text = viewAllLabel,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun MockMobileCompletedSectionHeader(
    title: String,
    expanded: Boolean,
    expandedCount: Int,
    onToggleExpanded: () -> Unit,
    showLabel: String,
    hideLabel: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    text = expandedCount.toString(),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            TextButton(onClick = onToggleExpanded) {
                Text(
                    text = if (expanded) hideLabel else showLabel,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

private fun LazyListScope.mockMobileHistoricChoreSection(
    chores: List<MobileChore>,
    expandedChoreIds: Set<String>,
    onExpandedChange: (String) -> Unit,
    emptyMessage: String? = null
) {
    if (chores.isEmpty()) {
        if (!emptyMessage.isNullOrBlank()) {
            item {
                Text(
                    text = emptyMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    items(chores, key = { it.id }) { chore ->
        HistoricChoreCard(
            chore = chore,
            expanded = expandedChoreIds.contains(chore.id),
            onExpandedChange = { onExpandedChange(chore.id) }
        )
    }
}
private fun LazyListScope.historicChoreSection(
    chores: List<MobileChore>,
    @Suppress("UNUSED_PARAMETER") title: String,
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
    @Suppress("UNUSED_PARAMETER") title: String,
    currentUserId: String?,
    currentUserRole: String?,
    supportsTakeoverRequests: Boolean,
    expandedChoreIds: Set<String>,
    activeReviewAction: String?,
    activeStartAction: String?,
    activeSubmitAction: String?,
    activeCloseCycleAction: String?,
    activeCancelChoreAction: String?,
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
    onCancelChoreOccurrence: (String) -> Unit,
    onCloseChoreCycle: (String) -> Unit,
    onCancelChore: (String) -> Unit,
    activeDueAtAction: String?,
    onEditChoreDueAt: (String, String, String, String?) -> Unit,
    templateVariantsByTemplateId: Map<String, List<com.taskbandit.app.mobile.MobileTemplateVariant>>,
    onTakeOverChore: (String) -> Unit,
    onRequestTakeover: (String) -> Unit,
    onSubmitChore: (String) -> Unit,
    activeExternalCompleteAction: String?,
    onCompleteExternalChore: (String, String) -> Unit,
    toneOverride: MobileChoreSectionTone? = null,
) {
    if (chores.isEmpty()) return
    val tone = toneOverride ?: when (chores.firstOrNull()?.let { resolveChoreSection(it, currentUserId) }) {
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
                activeCancelChoreAction = activeCancelChoreAction,
                activeTakeoverRequestAction = activeTakeoverRequestAction,
                activeDueAtAction = activeDueAtAction,
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
                onCancelChoreOccurrence = onCancelChoreOccurrence,
                onCloseChoreCycle = onCloseChoreCycle,
                onCancelChore = onCancelChore,
                onEditChoreDueAt = onEditChoreDueAt,
                editableVariants = chore.templateId?.let { templateVariantsByTemplateId[it] }.orEmpty(),
                onTakeOverChore = onTakeOverChore,
                onRequestTakeover = onRequestTakeover,
                onSubmitChore = onSubmitChore,
                activeExternalCompleteAction = activeExternalCompleteAction,
                onCompleteExternalChore = onCompleteExternalChore
            )
        }
    }
}

@Composable
private fun HistoricChoreSectionColumn(
    chores: List<MobileChore>,
    @Suppress("UNUSED_PARAMETER") title: String,
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
    @Suppress("UNUSED_PARAMETER") title: String,
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
            MobileChoreSectionTone.OVERDUE -> SectionToneColors(
                container = Color(0xFF3B1818),
                content = Color(0xFFFFECEC),
                badgeContainer = Color(0xFFFF6B6B),
                badgeContent = Color(0xFF3B0000),
                borderColor = Color(0xFFCC3333)
            )
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
            MobileChoreSectionTone.OVERDUE -> SectionToneColors(
                container = Color(0xFFFFF0F0),
                content = Color(0xFF3D1010),
                badgeContainer = Color(0xFFD94040),
                badgeContent = Color(0xFFFFEEEE),
                borderColor = Color(0xFFE08080)
            )
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
    assignmentReasonLabel: String? = null,
    subtypeLabel: String? = null,
    requirePhotoProof: Boolean,
    includeWeekdayInDueDate: Boolean = true,
    dueLabelResId: Int = R.string.mobile_due_at,
    modifier: Modifier = Modifier
) {
    val contextToken = when {
        !subtypeLabel.isNullOrBlank() -> subtypeLabel
        !assignmentReasonLabel.isNullOrBlank() -> assignmentReasonLabel
        !assignmentLabel.isNullOrBlank() -> assignmentLabel
        requirePhotoProof -> stringResource(R.string.mobile_photo_required_hint)
        else -> null
    }
    val dueText = stringResource(
        dueLabelResId,
        if (includeWeekdayInDueDate) formatDueAtForCard(dueAt) else formatDueAtForHistoricCard(dueAt)
    )
    Text(
        text = if (contextToken.isNullOrBlank()) dueText else "$dueText | $contextToken",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
    )
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
    val isNewMobileUi = LocalIsNewMobileUi.current
    val statusLabel = chore.state.replace('_', ' ')
    val hasHistoricDetails = chore.checklist.isNotEmpty() || chore.requirePhotoProof
    val baseTypeTitle = chore.typeTitle.ifBlank { chore.title }
    val choreIconDrawable = resolveChoreIconDrawable(baseTypeTitle, chore.groupTitle)
    val typeTitle = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(baseTypeTitle))
    val subtypeLabel = normalizeSubtypeLabel(chore.subtypeLabel)
    val historicDate = if (chore.state == "cancelled") {
        chore.cancelledAt ?: chore.completedAt ?: chore.dueAt
    } else {
        chore.completedAt ?: chore.dueAt
    }
    val historicDateLabelResId = if (chore.state == "cancelled") {
        R.string.mobile_cancelled_at
    } else {
        R.string.mobile_completed_at
    }
    if (isNewMobileUi) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().heightIn(min = 104.dp).padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (choreIconDrawable != null) {
                    Box(
                        modifier = Modifier.size(40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(choreIconDrawable),
                            contentDescription = null,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = typeTitle,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${stringResource(historicDateLabelResId, formatDueAtForHistoricCard(historicDate))} - ${chore.groupTitle}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(
                        text = statusLabel,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        return
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 9.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
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
                        text = chore.groupTitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = typeTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    CompactChoreMeta(
                        dueAt = historicDate,
                        subtypeLabel = subtypeLabel,
                        assignmentLabel = stringResource(R.string.mobile_chores_history),
                        requirePhotoProof = chore.requirePhotoProof,
                        includeWeekdayInDueDate = false,
                        dueLabelResId = historicDateLabelResId
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
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f)
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
    chore: MobileChore, currentUserId: String?, currentUserRole: String?, supportsTakeoverRequests: Boolean, expanded: Boolean, activeReviewAction: String?, activeStartAction: String?, activeSubmitAction: String?, activeCloseCycleAction: String?, activeCancelChoreAction: String?, activeTakeoverRequestAction: String?, activeDueAtAction: String?,
    outgoingTakeoverRequest: MobileTakeoverRequest?,
    selectedChecklistIds: Set<String>, selectedProofCount: Int, onExpandedChange: () -> Unit, onApprove: (String) -> Unit, onReject: (String) -> Unit,
    onToggleChecklistItem: (String, String, List<String>) -> Unit, onPickProofs: (String) -> Unit, onTakeProofPhoto: (String) -> Unit, onStartChore: (String) -> Unit, onCancelChoreOccurrence: (String) -> Unit, onCloseChoreCycle: (String) -> Unit, onCancelChore: (String) -> Unit, onEditChoreDueAt: (String, String, String, String?) -> Unit, onTakeOverChore: (String) -> Unit, onRequestTakeover: (String) -> Unit, onSubmitChore: (String) -> Unit, activeExternalCompleteAction: String?,
    onCompleteExternalChore: (String, String) -> Unit,
    editableVariants: List<com.taskbandit.app.mobile.MobileTemplateVariant>,
    showSectionBadge: Boolean = true,
    @Suppress("UNUSED_PARAMETER") showTitleIcon: Boolean = true
) {
    val context = LocalContext.current
    val zoneId = remember { ZoneId.systemDefault() }
    var showApproveConfirm by remember { mutableStateOf(false) }
    var showRejectConfirm by remember { mutableStateOf(false) }
    var showCancelOccurrenceConfirm by remember { mutableStateOf(false) }
    var showCloseCycleConfirm by remember { mutableStateOf(false) }
    var showManageMenu by remember { mutableStateOf(false) }
    var showDueAtEditor by remember { mutableStateOf(false) }
    var showExternalCompleteDialog by remember { mutableStateOf(false) }
    var externalCompleterNameInput by remember { mutableStateOf("") }
    var dueAtEditorTitle by remember(chore.id, chore.title) { mutableStateOf(chore.title) }
    var dueAtEditorVariantId by remember(chore.id, chore.variantId) { mutableStateOf(chore.variantId ?: "") }
    var dueAtVariantDropdownExpanded by remember { mutableStateOf(false) }
    var dueAtEditorMillis by remember(chore.id, chore.dueAt) {
        mutableLongStateOf(
            runCatching { Instant.parse(chore.dueAt).toEpochMilli() }.getOrElse { System.currentTimeMillis() }
        )
    }
    val dueAtEditorDatePicker = remember(context, dueAtEditorMillis) {
        val localDateTime = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
        DatePickerDialog(
            context,
            { _, year, month, day ->
                val existing = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
                dueAtEditorMillis = existing
                    .withYear(year)
                    .withMonth(month + 1)
                    .withDayOfMonth(day)
                    .atZone(zoneId)
                    .toInstant()
                    .toEpochMilli()
            },
            localDateTime.year,
            localDateTime.monthValue - 1,
            localDateTime.dayOfMonth
        )
    }
    val dueAtEditorTimePicker = remember(context, dueAtEditorMillis) {
        val localDateTime = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
        TimePickerDialog(
            context,
            { _, hourOfDay, minute ->
                val existing = Instant.ofEpochMilli(dueAtEditorMillis).atZone(zoneId).toLocalDateTime()
                dueAtEditorMillis = existing
                    .withHour(hourOfDay)
                    .withMinute(minute)
                    .withSecond(0)
                    .withNano(0)
                    .atZone(zoneId)
                    .toInstant()
                    .toEpochMilli()
            },
            localDateTime.hour,
            localDateTime.minute,
            true
        )
    }
    val activeDueAtActionKey = "update-due:${chore.id}"
    val canEditDueAt =
        LocalMobileFeatureAccess.current.choresManage &&
        currentUserRole != "child" &&
        chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")

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
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = dueAtVariantDropdownExpanded)
                                },
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            )
                            ExposedDropdownMenu(
                                expanded = dueAtVariantDropdownExpanded,
                                onDismissRequest = { dueAtVariantDropdownExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.mobile_create_no_subtype)) },
                                    onClick = {
                                        dueAtEditorVariantId = ""
                                        dueAtVariantDropdownExpanded = false
                                    }
                                )
                                editableVariants.forEach { variant ->
                                    DropdownMenuItem(
                                        text = { Text(variant.label) },
                                        onClick = {
                                            dueAtEditorVariantId = variant.id
                                            dueAtVariantDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                    Text(
                        text = formatDueAtForCard(Instant.ofEpochMilli(dueAtEditorMillis).toString()),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
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
                    Text(
                        stringResource(
                            if (activeDueAtAction == activeDueAtActionKey) {
                                R.string.mobile_updating_due_at
                            } else {
                                R.string.mobile_save_due_at
                            }
                        )
                    )
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDueAtEditor = false }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

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
                Button(onClick = {
                    showCancelOccurrenceConfirm = false
                    onCancelChoreOccurrence(chore.id)
                }) {
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
                Button(onClick = {
                    showCloseCycleConfirm = false
                    onCloseChoreCycle(chore.id)
                }) {
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
                    Text(
                        stringResource(
                            if (activeExternalCompleteAction == "complete-external:${chore.id}") {
                                R.string.mobile_completing_external
                            } else {
                                R.string.mobile_complete_external_confirm
                            }
                        )
                    )
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showExternalCompleteDialog = false; externalCompleterNameInput = "" }) {
                    Text(stringResource(R.string.mobile_request_takeover_cancel))
                }
            }
        )
    }

    val featureAccess = LocalMobileFeatureAccess.current
    val canManageChores = featureAccess.choresManage
    val canApproveChores = featureAccess.approvals
    val canUseDirectTakeover = featureAccess.takeoverDirect
    val canUseTakeoverRequests = featureAccess.takeoverRequests && supportsTakeoverRequests
    val canUploadProofs = featureAccess.proofUploads
    val isPendingApproval = chore.state == "pending_approval"
    val isSubmittableState = chore.state in setOf("open", "assigned", "in_progress", "needs_fixes", "overdue")
    val isAssignedToCurrentUser = chore.assigneeId != null && chore.assigneeId == currentUserId
    val isUnassigned = chore.assigneeId == null
    val canManageTask = canManageChores && (isUnassigned || isAssignedToCurrentUser)
    val canSubmitCurrentUser = canManageChores && isAssignedToCurrentUser && isSubmittableState
    val canCancelOccurrence = canManageChores && currentUserRole != "child" && chore.supportsOccurrenceCancellation
    val canCloseCycle = canManageChores && currentUserRole != "child" && chore.supportsSeriesCancellation
    val canCompleteExternal = featureAccess.externalCompletion && currentUserRole != "child" && isSubmittableState
    val section = resolveChoreSection(chore, currentUserId)
    val baseTypeTitle = chore.typeTitle.ifBlank { chore.title }
    val choreIconDrawable = resolveChoreIconDrawable(baseTypeTitle, chore.groupTitle, chore.subtypeLabel)
    val typeTitle = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(baseTypeTitle))
    val subtypeLabel = normalizeSubtypeLabel(chore.subtypeLabel)
    val assignmentReasonLabel = describeAssignmentReason(chore.assignmentReason)
    val canClaimChore =
        canManageChores &&
            isSubmittableState &&
            !isAssignedToCurrentUser &&
            (isUnassigned || canUseDirectTakeover)
    val hasPendingOutgoingTakeover = outgoingTakeoverRequest?.status == "PENDING"
    val canRequestTakeover = canManageChores &&
        canUseTakeoverRequests &&
        currentUserRole != "child" &&
        chore.assigneeId == currentUserId &&
        !hasPendingOutgoingTakeover
    val hasSecondaryActions = canEditDueAt || canCancelOccurrence || canCloseCycle || canRequestTakeover || canCompleteExternal
    val outgoingTakeoverFirstName = outgoingTakeoverRequest?.requested?.displayName?.let(::firstNameFromDisplayName)
    val statusLabel = if (chore.isOverdue) stringResource(R.string.mobile_state_overdue) else chore.state.replace('_', ' ')
    val isNewMobileUi = LocalIsNewMobileUi.current
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

    if (isNewMobileUi) {
        val isOverdueBucket = resolveMyChoreDueBucket(chore) == MobileMyChoreDueBucket.OVERDUE
        val mockStatusLabel = when {
            chore.state == "completed" -> "Done"
            isOverdueBucket -> "Overdue"
            chore.isOverdue || isDueSoonForMockCard(chore.dueAt) -> "Due soon"
            else -> "To do"
        }
        val mockStatusContainer = when (mockStatusLabel) {
            "Done" -> MaterialTheme.colorScheme.primaryContainer
            "Overdue" -> MaterialTheme.colorScheme.errorContainer
            "Due soon" -> MaterialTheme.colorScheme.tertiaryContainer
            else -> MaterialTheme.colorScheme.surfaceVariant
        }
        val mockStatusContent = when (mockStatusLabel) {
            "Done" -> MaterialTheme.colorScheme.onPrimaryContainer
            "Overdue" -> MaterialTheme.colorScheme.onErrorContainer
            "Due soon" -> MaterialTheme.colorScheme.onTertiaryContainer
            else -> MaterialTheme.colorScheme.onSurfaceVariant
        }
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onExpandedChange() },
            shape = RoundedCornerShape(15.dp),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    isOverdueBucket -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.22f)
                    isAssignedToCurrentUser -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    else -> MaterialTheme.colorScheme.surface.copy(alpha = 0.94f)
                }
            ),
            border = BorderStroke(
                1.dp,
                when {
                    isOverdueBucket -> MaterialTheme.colorScheme.error.copy(alpha = 0.5f)
                    isAssignedToCurrentUser -> MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.18f)
                }
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 78.dp)
                    .padding(
                        horizontal = 4.dp,
                        vertical = if (!subtypeLabel.isNullOrBlank()) 5.dp else 8.dp
                    ),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (choreIconDrawable != null) {
                    Box(
                        modifier = Modifier.size(42.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(choreIconDrawable),
                            contentDescription = null,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(38.dp)
                        )
                    }
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(
                        if (!subtypeLabel.isNullOrBlank()) 1.dp else 4.dp
                    )
                ) {
                    Text(
                        text = typeTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!subtypeLabel.isNullOrBlank()) {
                        Text(
                            text = subtypeLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(
                        text = "${formatDueAtForMockCard(chore.dueAt)} - ${chore.groupTitle.ifBlank { "Home" }}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Surface(
                    modifier = Modifier.widthIn(min = 58.dp, max = 84.dp).heightIn(min = 28.dp),
                    shape = RoundedCornerShape(10.dp),
                    color = mockStatusContainer
                ) {
                    Box(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = mockStatusLabel,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = mockStatusContent,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
        return
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
                if (showSectionBadge) {
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
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = typeTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
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
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (chore.isOverdue) {
                                    MaterialTheme.colorScheme.onErrorContainer
                                } else {
                                    accentContentColor
                                }
                            )
                        }
                    }
                    CompactChoreMeta(
                        dueAt = chore.dueAt,
                        assignmentLabel = chore.groupTitle,
                        assignmentReasonLabel = assignmentReasonLabel,
                        subtypeLabel = subtypeLabel,
                        requirePhotoProof = chore.requirePhotoProof
                    )
                }
                if (hasSecondaryActions) {
                    Box {
                        IconButton(
                            onClick = { showManageMenu = true },
                            modifier = Modifier.size(30.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.MoreVert,
                                contentDescription = stringResource(R.string.mobile_more_actions)
                            )
                        }
                        DropdownMenu(
                            expanded = showManageMenu,
                            onDismissRequest = { showManageMenu = false }
                        ) {
                            if (canRequestTakeover) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (activeTakeoverRequestAction?.startsWith("request:${chore.id}:") == true) {
                                                    R.string.mobile_request_takeover_sending
                                                } else {
                                                    R.string.mobile_request_takeover
                                                }
                                            )
                                        )
                                    },
                                    enabled = activeTakeoverRequestAction == null,
                                    onClick = {
                                        showManageMenu = false
                                        onRequestTakeover(chore.id)
                                    }
                                )
                            }
                            if (canEditDueAt) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (activeDueAtAction == activeDueAtActionKey) {
                                                    R.string.mobile_updating_due_at
                                                } else {
                                                    R.string.mobile_edit_due_at
                                                }
                                            )
                                        )
                                    },
                                    enabled = activeDueAtAction == null,
                                    onClick = {
                                        showManageMenu = false
                                        dueAtEditorTitle = chore.title
                                        dueAtEditorVariantId = chore.variantId ?: ""
                                        showDueAtEditor = true
                                    }
                                )
                            }
                            if (canCancelOccurrence) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (activeCloseCycleAction == "cancel-occurrence:${chore.id}") {
                                                    R.string.mobile_cancelling_occurrence
                                                } else {
                                                    R.string.mobile_cancel_occurrence
                                                }
                                            )
                                        )
                                    },
                                    enabled = activeCloseCycleAction == null,
                                    onClick = {
                                        showManageMenu = false
                                        showCancelOccurrenceConfirm = true
                                    }
                                )
                            }
                            if (canCloseCycle) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (activeCloseCycleAction == "cancel-series:${chore.id}") {
                                                    R.string.mobile_cancelling_series
                                                } else {
                                                    R.string.mobile_cancel_series
                                                }
                                            )
                                        )
                                    },
                                    enabled = activeCloseCycleAction == null,
                                    onClick = {
                                        showManageMenu = false
                                        showCloseCycleConfirm = true
                                    }
                                )
                            }
                            if (canCompleteExternal) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(
                                                if (activeExternalCompleteAction == "complete-external:${chore.id}") {
                                                    R.string.mobile_completing_external
                                                } else {
                                                    R.string.mobile_complete_external
                                                }
                                            )
                                        )
                                    },
                                    enabled = activeExternalCompleteAction == null,
                                    onClick = {
                                        showManageMenu = false
                                        showExternalCompleteDialog = true
                                    }
                                )
                            }
                        }
                    }
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
                if (canApproveChores) {
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
                } else {
                    Text(
                        text = stringResource(R.string.mobile_feature_approvals_disabled),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                return@Column
            }

            if (isSubmittableState) {
                Button(
                    onClick = {
                        if (canClaimChore) {
                            if (isUnassigned) {
                                onStartChore(chore.id)
                            } else {
                                onTakeOverChore(chore.id)
                            }
                        } else {
                            onExpandedChange()
                        }
                    },
                    enabled = if (canClaimChore) activeStartAction == null else true,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 38.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        stringResource(
                            if (canClaimChore) {
                                if (isUnassigned) {
                                    if (activeStartAction == "start:${chore.id}") {
                                        R.string.mobile_starting
                                    } else {
                                        R.string.mobile_claim_task
                                    }
                                } else {
                                    if (activeStartAction == "takeover:${chore.id}") {
                                        R.string.mobile_taking_over_task
                                    } else {
                                        R.string.mobile_take_over_task
                                    }
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

            if (expanded && !canClaimChore) {
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
                            if (!canUploadProofs) {
                                Text(
                                    text = stringResource(R.string.mobile_feature_proof_uploads_disabled),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            } else if (selectedProofCount > 0) {
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
                        if (canSubmitCurrentUser) {
                            if (chore.requirePhotoProof) {
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
                                        onClick = { onPickProofs(chore.id) },
                                        enabled = canUploadProofs && activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(R.string.mobile_pick_photos))
                                    }
                                    OutlinedButton(
                                        onClick = { onTakeProofPhoto(chore.id) },
                                        enabled = canUploadProofs && activeSubmitAction == null,
                                        modifier = Modifier.weight(1f).heightIn(min = 36.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(stringResource(R.string.mobile_take_photo))
                                    }
                                }
                                Button(
                                    onClick = { onSubmitChore(chore.id) },
                                    enabled = canUploadProofs && activeSubmitAction == null,
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(stringResource(if (activeSubmitAction == "submit:${chore.id}") R.string.mobile_submitting else R.string.mobile_submit))
                                }
                            } else {
                                Button(
                                    onClick = { onSubmitChore(chore.id) },
                                    enabled = activeSubmitAction == null,
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 36.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(stringResource(if (activeSubmitAction == "submit:${chore.id}") R.string.mobile_submitting else R.string.mobile_submit))
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
                            }
                        }
                    }

                }
            }
        }
    }
}

@Composable
private fun CompletionCelebrationDialog(
    celebration: MobileCompletionCelebration,
    onDismiss: () -> Unit
) {
    val accentColor = when (celebration.variant) {
        MobileCompletionCelebrationVariant.RARE -> Color(0xFFFCCC3D)
        MobileCompletionCelebrationVariant.CHORE -> Color(0xFF73D9B3)
        MobileCompletionCelebrationVariant.PERFECT -> Color(0xFF73D9B3)
        MobileCompletionCelebrationVariant.STANDARD -> MaterialTheme.colorScheme.primary
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(celebration.titleResource),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(176.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CelebrationConfettiBurst(
                        modifier = Modifier.fillMaxSize(),
                        variant = celebration.variant
                    )
                    Image(
                        painter = painterResource(R.drawable.ic_taskbandit_mascot_success),
                        contentDescription = stringResource(R.string.brand_mark_description),
                        modifier = Modifier.size(116.dp)
                    )
                }
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = accentColor.copy(alpha = 0.18f)
                ) {
                    Text(
                        text = stringResource(celebration.eyebrowResource),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                }
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = stringResource(R.string.mobile_celebration_points, celebration.points),
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = celebration.choreTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = stringResource(celebration.phraseResource),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text(stringResource(R.string.mobile_celebration_close))
            }
        }
    )
}

@Composable
private fun CelebrationConfettiBurst(
    modifier: Modifier = Modifier,
    variant: MobileCompletionCelebrationVariant = MobileCompletionCelebrationVariant.STANDARD
) {
    val transition = rememberInfiniteTransition(label = "celebration-confetti")
    val progress = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "celebration-confetti-progress"
    )
    val colors = when (variant) {
        MobileCompletionCelebrationVariant.RARE -> listOf(
            Color(0xFFFCCC3D),
            Color(0xFFFFF1A8),
            Color(0xFF73C9F4),
            Color(0xFFFF8A5B),
            Color(0xFFFFFFFF)
        )
        MobileCompletionCelebrationVariant.CHORE -> listOf(
            Color(0xFF73D9B3),
            Color(0xFF637052),
            Color(0xFFD8B77E),
            Color(0xFF9ED18B),
            Color(0xFF73C9F4)
        )
        MobileCompletionCelebrationVariant.PERFECT -> listOf(
            Color(0xFFFFFFFF),
            Color(0xFF73D9B3),
            Color(0xFFFCCC3D),
            Color(0xFF9ED18B),
            Color(0xFF73C9F4)
        )
        MobileCompletionCelebrationVariant.STANDARD -> listOf(
            Color(0xFFD8B77E),
            Color(0xFF9B5218),
            Color(0xFF637052),
            Color(0xFF73C9F4),
            Color(0xFFFCCC3D)
        )
    }
    val particles = listOf(
        Triple(0.08f, 0.05f, 0.00f),
        Triple(0.14f, 0.09f, 0.07f),
        Triple(0.21f, 0.07f, 0.15f),
        Triple(0.29f, 0.12f, 0.23f),
        Triple(0.36f, 0.06f, 0.31f),
        Triple(0.44f, 0.11f, 0.39f),
        Triple(0.52f, 0.07f, 0.47f),
        Triple(0.61f, 0.1f, 0.55f),
        Triple(0.69f, 0.05f, 0.63f),
        Triple(0.77f, 0.1f, 0.71f),
        Triple(0.84f, 0.06f, 0.79f),
        Triple(0.92f, 0.09f, 0.87f)
    )

    Canvas(
        modifier = modifier
    ) {
        particles.forEachIndexed { index, (xFraction, driftFraction, offset) ->
            val particleProgress = (progress.value + offset) % 1f
            val sway = kotlin.math.sin((particleProgress * 6.28318f * 2f) + index).toFloat()
            val centerX = size.width * (xFraction + driftFraction * sway)
            val centerY = size.height * (-0.12f + particleProgress * 1.22f)
            val alpha = 0.95f - (particleProgress * 0.22f)
            val color = colors[index % colors.size].copy(alpha = alpha)

            if (index % 3 == 0) {
                drawCircle(
                    color = color,
                    radius = size.minDimension * 0.03f,
                    center = androidx.compose.ui.geometry.Offset(centerX, centerY)
                )
            } else {
                val width = if (index % 2 == 0) size.minDimension * 0.11f else size.minDimension * 0.075f
                val height = if (index % 2 == 0) size.minDimension * 0.035f else size.minDimension * 0.055f
                rotate(
                    degrees = particleProgress * 620f + index * 24f,
                    pivot = androidx.compose.ui.geometry.Offset(centerX, centerY)
                ) {
                    drawRoundRect(
                        color = color,
                        topLeft = androidx.compose.ui.geometry.Offset(centerX - width / 2f, centerY - height / 2f),
                        size = androidx.compose.ui.geometry.Size(width, height),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(width * 0.28f, width * 0.28f)
                    )
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
    val isNewMobileUi = LocalIsNewMobileUi.current
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(if (isNewMobileUi) 16.dp else 24.dp),
        border = if (isNewMobileUi) BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)) else null
    ) {
        Column(
            modifier = Modifier.padding(horizontal = if (isNewMobileUi) 10.dp else 12.dp, vertical = if (isNewMobileUi) 9.dp else 10.dp),
            verticalArrangement = Arrangement.spacedBy(if (isNewMobileUi) 8.dp else 10.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = icon, contentDescription = null)
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall
                )
            }
            content()
        }
    }
}

@Composable
private fun SettingsValueLine(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelSmall)
        Text(text = value, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun CreatePanelCard(
    modifier: Modifier = Modifier,
    @Suppress("UNUSED_PARAMETER") title: String,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false,
    content: @Composable () -> Unit
) {
    var expanded by rememberSaveable(title, compact) { mutableStateOf(!collapsedByDefault) }
    val sectionSpacing = if (compact) 10.dp else 16.dp
    val sectionPadding = if (compact) 12.dp else 18.dp
    val shape = if (compact) RoundedCornerShape(20.dp) else RoundedCornerShape(24.dp)

    Card(modifier = modifier, shape = shape) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(sectionPadding),
            verticalArrangement = Arrangement.spacedBy(sectionSpacing)
        ) {
            if (compact) {
                TextButton(
                    onClick = { expanded = !expanded },
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (expanded) "-" else "+",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            } else {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            if (!compact || expanded) {
                content()
            }
        }
    }
}

@Composable
private fun CreateTemplateAndSchedulePanel(
    selectedTemplateGroupTitle: String?,
    templateGroupDropdownExpanded: Boolean,
    onTemplateGroupDropdownExpandedChange: (Boolean) -> Unit,
    onTemplateGroupSelected: (String) -> Unit,
    templateGroups: List<String>,
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    templateDropdownExpanded: Boolean,
    onTemplateDropdownExpandedChange: (Boolean) -> Unit,
    onTemplateSelected: (String) -> Unit,
    templates: List<com.taskbandit.app.mobile.MobileChoreTemplate>,
    createDueAtMillis: Long,
    onPickDate: () -> Unit,
    onPickTime: () -> Unit,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    CreatePanelCard(
        title = stringResource(R.string.mobile_create_title),
        compact = compact,
        collapsedByDefault = collapsedByDefault
    ) {
        Text(text = stringResource(R.string.mobile_create_group), style = MaterialTheme.typography.titleSmall)
        ExposedDropdownMenuBox(
            expanded = templateGroupDropdownExpanded,
            onExpandedChange = onTemplateGroupDropdownExpandedChange
        ) {
            OutlinedTextField(
                value = selectedTemplateGroupTitle ?: stringResource(R.string.mobile_create_select_group_prompt),
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = templateGroupDropdownExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
            )
            ExposedDropdownMenu(
                expanded = templateGroupDropdownExpanded,
                onDismissRequest = { onTemplateGroupDropdownExpandedChange(false) }
            ) {
                templateGroups.forEach { groupTitle ->
                    DropdownMenuItem(
                        text = { Text(groupTitle) },
                        onClick = { onTemplateGroupSelected(groupTitle) }
                    )
                }
            }
        }

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
    createRecurrenceWeekdays: List<String>,
    createRecurrenceWeekdaysError: String?,
    recurrenceTypeDropdownExpanded: Boolean,
    onRecurrenceDropdownExpandedChange: (Boolean) -> Unit,
    onRecurrenceTypeSelected: (String) -> Unit,
    onRecurrenceIntervalChange: (String) -> Unit,
    onToggleRecurrenceWeekday: (String) -> Unit,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    val recurrenceLabel = recurrenceTypeLabel(createRecurrenceType)
    CreatePanelCard(
        title = stringResource(R.string.mobile_create_repeat),
        compact = compact,
        collapsedByDefault = collapsedByDefault
    ) {
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
                listOf("none", "daily", "weekly", "custom_weekly", "every_x_days", "monthly", "template").forEach { type ->
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
        if (createRecurrenceType == "custom_weekly") {
            Text(
                text = stringResource(R.string.mobile_create_weekdays_label),
                style = MaterialTheme.typography.titleSmall
            )
            MobileChoiceRow(
                options = recurrenceWeekdayOrder.map { weekday ->
                    MobileChoiceOption(
                        label = weekdayShortLabel(weekday),
                        selected = createRecurrenceWeekdays.contains(weekday),
                        onClick = { onToggleRecurrenceWeekday(weekday) }
                    )
                }
            )
            if (!createRecurrenceWeekdaysError.isNullOrBlank()) {
                Text(
                    text = createRecurrenceWeekdaysError,
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
    onPickEndTime: () -> Unit,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    val effectiveRecurrenceType = resolveEffectiveCreateRecurrenceType(selectedTemplate, createRecurrenceType)
    if (effectiveRecurrenceType == "none") {
        return
    }

    CreatePanelCard(
        title = stringResource(R.string.mobile_create_repeat_duration),
        compact = compact,
        collapsedByDefault = collapsedByDefault
    ) {
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
    members: List<com.taskbandit.app.mobile.MobileHouseholdMember>,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    val strategyLabel = assignmentStrategyLabel(createAssignmentStrategy)
    CreatePanelCard(
        title = stringResource(R.string.mobile_create_assignment),
        compact = compact,
        collapsedByDefault = collapsedByDefault
    ) {
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
                listOf("round_robin", "least_completed_recently", "highest_streak").forEach { strategy ->
                    DropdownMenuItem(
                        text = { Text(assignmentStrategyLabel(strategy)) },
                        onClick = { onAssignmentStrategySelected(strategy) }
                    )
                }
            }
        }

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

@Composable
private fun CreateVariantPanel(
    selectedTemplate: com.taskbandit.app.mobile.MobileChoreTemplate?,
    createVariantId: String?,
    variantDropdownExpanded: Boolean,
    onVariantDropdownExpandedChange: (Boolean) -> Unit,
    onVariantSelected: (String?) -> Unit,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    selectedTemplate?.takeIf { it.variants.isNotEmpty() }?.let { template ->
        val selectedVariantLabel =
            template.variants.firstOrNull { it.id == createVariantId }?.label
                ?: stringResource(R.string.mobile_create_select_variant_prompt)

        CreatePanelCard(
            title = stringResource(R.string.mobile_create_variant),
            compact = compact,
            collapsedByDefault = collapsedByDefault
        ) {
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
    createRecurrenceWeekdays: List<String>,
    createRecurrenceWeekdaysError: String?,
    createRecurrenceEndMode: String,
    createRecurrenceOccurrences: Int?,
    createRecurrenceOccurrencesError: String?,
    createRecurrenceEndsAtMillis: Long,
    createRecurrenceEndDateError: String?,
    createVariantId: String?,
    activeCreateAction: String?,
    onCreateChore: (String, String, String?, String, String?, Int?, List<String>, String?, Int?, String?, String?) -> Unit,
    compact: Boolean = false,
    collapsedByDefault: Boolean = false
) {
    CreatePanelCard(
        title = stringResource(R.string.mobile_create_action),
        compact = compact,
        collapsedByDefault = collapsedByDefault
    ) {
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
                    (effectiveRecurrenceType != "custom_weekly" || createRecurrenceWeekdaysError == null) &&
                    (!needsRecurrenceOccurrences || (createRecurrenceOccurrencesError == null && (createRecurrenceOccurrences ?: 0) > 0)) &&
                    (!needsRecurrenceEndDate || createRecurrenceEndDateError == null)
            Button(
                onClick = {
                    val recType = if (createRecurrenceType == "template") null else createRecurrenceType
                    val recInterval = if (createRecurrenceType == "every_x_days") createRecurrenceInterval else null
                    val recWeekdays =
                        if (resolveEffectiveCreateRecurrenceType(template, createRecurrenceType) == "custom_weekly") {
                            createRecurrenceWeekdays
                        } else {
                            emptyList()
                        }
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
                        recWeekdays,
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
    var showTechnicalDetails by rememberSaveable(currentDevice?.id) { mutableStateOf(false) }
    val pushReadinessText = when {
        currentDevice == null -> stringResource(R.string.mobile_device_push_missing)
        !notificationsPermissionGranted -> stringResource(R.string.mobile_device_push_permission_needed)
        !currentDevice.pushTokenConfigured -> stringResource(R.string.mobile_device_push_token_needed)
        !currentDevice.notificationsEnabled -> stringResource(R.string.mobile_device_push_disabled)
        else -> stringResource(R.string.mobile_device_push_ready)
    }

    Text(text = if (currentDevice == null) stringResource(R.string.mobile_device_status_missing) else stringResource(R.string.mobile_device_status_ready), style = MaterialTheme.typography.bodyMedium)
    SettingsValueLine(label = stringResource(R.string.mobile_settings_notifications_permission), value = stringResource(if (notificationsPermissionGranted) R.string.mobile_settings_notifications_allowed else R.string.mobile_settings_notifications_needed))
    SettingsValueLine(label = stringResource(R.string.mobile_settings_push_readiness), value = pushReadinessText)
    Text(text = stringResource(R.string.mobile_device_push_readiness_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    TextButton(onClick = { showTechnicalDetails = !showTechnicalDetails }) {
        Text(
            stringResource(
                if (showTechnicalDetails) {
                    R.string.mobile_device_hide_details
                } else {
                    R.string.mobile_device_show_details
                }
            )
        )
    }
    if (showTechnicalDetails) {
        SettingsValueLine(label = stringResource(R.string.mobile_settings_installation_id), value = installationId)
        currentDevice?.let { device ->
            SettingsValueLine(label = stringResource(R.string.mobile_settings_provider), value = device.provider)
            SettingsValueLine(
                label = stringResource(R.string.mobile_settings_device_name),
                value = device.deviceName ?: stringResource(R.string.mobile_settings_unknown)
            )
            device.appVersion?.let {
                SettingsValueLine(label = stringResource(R.string.mobile_settings_app_version), value = it)
            }
            device.locale?.let {
                SettingsValueLine(label = stringResource(R.string.mobile_settings_locale), value = it)
            }
            SettingsValueLine(label = stringResource(R.string.mobile_settings_last_seen), value = formatApiTimestamp(device.lastSeenAt))
        }
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
    onDownloadAndInstall: (GitHubReleaseInfo) -> Unit
) {
    val isUpToDate = githubCheckDone &&
        !githubCheckError &&
        githubLatestVersion != null &&
        compareReleaseVersions(BuildConfig.TASKBANDIT_RELEASE_VERSION, githubLatestVersion) >= 0
    val githubVersionDisplay = when {
        !githubCheckDone -> null
        githubCheckError -> stringResource(R.string.mobile_settings_github_check_failed)
        githubLatestVersion == null -> stringResource(R.string.mobile_settings_unknown)
        else -> "v$githubLatestVersion"
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = stringResource(R.string.mobile_settings_app_release),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            if (isUpToDate) {
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = stringResource(R.string.mobile_settings_up_to_date),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                    )
                }
            }
            Text(text = currentReleaseLabel, style = MaterialTheme.typography.bodyMedium)
        }
    }
    SettingsValueLine(label = stringResource(R.string.mobile_settings_server_release), value = serverReleaseLabel ?: stringResource(R.string.mobile_settings_unknown))
    if (!githubCheckDone) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = stringResource(R.string.mobile_settings_latest_github), style = MaterialTheme.typography.labelSmall)
            CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp)
        }
    } else if (githubCheckError) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onCheckForUpdates),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.mobile_settings_latest_github),
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                text = stringResource(R.string.mobile_settings_github_check_failed),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }
    } else {
        SettingsValueLine(label = stringResource(R.string.mobile_settings_latest_github), value = githubVersionDisplay ?: stringResource(R.string.mobile_settings_unknown))
    }
    OutlinedButton(
        onClick = onCheckForUpdates,
        enabled = githubCheckDone && !isDownloadingUpdate,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            if (githubCheckError) stringResource(R.string.mobile_settings_retry_check)
            else stringResource(R.string.mobile_settings_check_for_updates)
        )
    }
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
    if (visibleGithubUpdate != null) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = stringResource(R.string.mobile_github_update_available_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = stringResource(R.string.mobile_github_update_available_subtitle, "v${BuildConfig.TASKBANDIT_RELEASE_VERSION}", "v${visibleGithubUpdate.version}"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (visibleGithubUpdate.body.isNotBlank()) {
                    Text(
                        text = visibleGithubUpdate.body.trim(),
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (isDownloadingUpdate) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        LinearProgressIndicator(
                            progress = { downloadProgress },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = stringResource(R.string.mobile_github_downloading, (downloadProgress * 100).toInt()),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    if (downloadError) {
                        Text(
                            text = stringResource(R.string.mobile_github_download_failed),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onDownloadAndInstall(visibleGithubUpdate) },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(stringResource(R.string.mobile_github_download_install, "v${visibleGithubUpdate.version}"))
                        }
                        TextButton(onClick = onDismissGithubUpdate) {
                            Text(stringResource(R.string.mobile_update_dismiss))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsPlanContent(
    hostedSubscription: MobileHostedSubscriptionOverview
) {
    val packageDisplayName = hostedSubscription.packageDisplayName ?: hostedSubscription.packageCode ?: stringResource(R.string.mobile_settings_unknown)
    val statusSummary = remember(
        hostedSubscription.lifecycleState,
        hostedSubscription.entitlementState,
        hostedSubscription.billingStatus
    ) {
        formatSubscriptionStatusSummary(
            lifecycleState = hostedSubscription.lifecycleState,
            entitlementState = hostedSubscription.entitlementState,
            billingStatus = hostedSubscription.billingStatus
        )
    }
    val storageLimit = hostedSubscription.quotas.storageBytesLimit
    val storageUsed = hostedSubscription.usage.storageBytesUsed
    val memberUsage = formatUsageSummary(
        hostedSubscription.usage.membersUsed?.toLong(),
        hostedSubscription.quotas.membersLimit?.toLong()
    )
    val notificationUsage = formatUsageSummary(
        hostedSubscription.usage.monthlyNotificationsUsed?.toLong(),
        hostedSubscription.quotas.monthlyNotificationLimit?.toLong()
    )
    val storageUsage = formatUsageSummary(
        storageUsed,
        storageLimit,
        formatter = ::formatByteSize
    )

    SettingsValueLine(label = stringResource(R.string.mobile_plan_package_name), value = packageDisplayName)
    SettingsValueLine(
        label = stringResource(R.string.mobile_plan_status),
        value = statusSummary ?: stringResource(R.string.mobile_settings_unknown)
    )
    SettingsValueLine(
        label = stringResource(R.string.mobile_plan_members_quota),
        value = memberUsage
    )
    SettingsValueLine(
        label = stringResource(R.string.mobile_plan_storage_quota),
        value = storageUsage
    )
    SettingsValueLine(
        label = stringResource(R.string.mobile_plan_monthly_notifications_quota),
        value = notificationUsage
    )
}

private fun formatSubscriptionStatusSummary(
    lifecycleState: String?,
    entitlementState: String?,
    billingStatus: String?
): String? = listOf(lifecycleState, entitlementState, billingStatus)
    .firstOrNull { !it.isNullOrBlank() }
    ?.replace('_', ' ')
    ?.trim()
    ?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

private fun formatLeaderboardRoleLabel(role: String): String =
    role
        .replace('_', ' ')
        .trim()
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

@Composable
private fun SettingsSessionContent(
    isBusy: Boolean,
    onRefresh: () -> Unit,
    onDownloadSettingsLogs: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(
            onClick = onRefresh,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) { Text(stringResource(R.string.mobile_refresh)) }
        OutlinedButton(
            onClick = onDownloadSettingsLogs,
            modifier = Modifier.fillMaxWidth()
        ) { Text(stringResource(R.string.mobile_settings_download_logs)) }
    }
}

@Composable
private fun SettingsLogoutContent(onLogout: () -> Unit) {
    OutlinedButton(
        onClick = onLogout,
        modifier = Modifier.fillMaxWidth()
    ) { Text(stringResource(R.string.mobile_logout)) }
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

        if (!hasAnyPrimaryAction && !hasSecondaryActions) {
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

private fun resolveChoreSection(chore: MobileChore, currentUserId: String?): MobileChoreSection = when {
    chore.assigneeId != null && chore.assigneeId == currentUserId -> MobileChoreSection.MINE
    chore.assigneeId.isNullOrBlank() -> MobileChoreSection.UNASSIGNED
    else -> MobileChoreSection.OTHERS
}

private enum class MobileMyChoreDueBucket {
    OVERDUE,
    TODAY,
    THIS_WEEK,
    LATER
}

private fun resolveMyChoreDueBucket(
    chore: MobileChore,
    zoneId: ZoneId = ZoneId.systemDefault(),
    @Suppress("UNUSED_PARAMETER") locale: Locale = Locale.getDefault()
): MobileMyChoreDueBucket {
    val today = LocalDate.now(zoneId)
    val dueDate = runCatching { Instant.parse(chore.dueAt).atZone(zoneId).toLocalDate() }.getOrDefault(today)

    if (dueDate.isBefore(today)) {
        return MobileMyChoreDueBucket.OVERDUE
    }
    if (!dueDate.isAfter(today)) {
        return MobileMyChoreDueBucket.TODAY
    }
    val endOfRollingWeek = today.plusDays(7)

    return if (!dueDate.isAfter(endOfRollingWeek)) {
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

@Composable
private fun describeAssignmentReason(reason: String?): String? = when (reason) {
    "round_robin" -> stringResource(R.string.mobile_assignment_reason_round_robin)
    "least_completed_recently" -> stringResource(R.string.mobile_assignment_reason_least_completed)
    "highest_streak" -> stringResource(R.string.mobile_assignment_reason_highest_streak)
    "manual" -> stringResource(R.string.mobile_assignment_reason_manual)
    "claimed" -> stringResource(R.string.mobile_assignment_reason_claimed)
    "sticky_follow_up" -> stringResource(R.string.mobile_assignment_reason_sticky_follow_up)
    "rebalanced" -> stringResource(R.string.mobile_assignment_reason_rebalanced)
    else -> null
}

private fun firstNameFromDisplayName(displayName: String?): String? =
    displayName
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?.split(Regex("\\s+"))
        ?.firstOrNull()

private fun initialsFromDisplayName(displayName: String): String {
    val tokens = displayName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
    if (tokens.isEmpty()) {
        return "U"
    }
    return tokens.joinToString("") { token -> token.first().uppercaseChar().toString() }
}

private fun loadImageBitmapFromUri(
    context: Context,
    uriString: String?
): androidx.compose.ui.graphics.ImageBitmap? {
    if (uriString.isNullOrBlank()) {
        return null
    }
    val uri = runCatching { Uri.parse(uriString) }.getOrNull() ?: return null
    return runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val source = ImageDecoder.createSource(context.contentResolver, uri)
            ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                decoder.isMutableRequired = false
            }.asImageBitmap()
        } else {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)?.asImageBitmap()
            }
        }
    }.getOrNull()
}

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
    else -> stringResource(R.string.mobile_create_assignment_round_robin)
}

@Composable
private fun recurrenceTypeLabel(value: String): String = when (value) {
    "none" -> stringResource(R.string.mobile_create_repeat_no)
    "daily" -> stringResource(R.string.mobile_create_repeat_daily_short)
    "weekly" -> stringResource(R.string.mobile_create_repeat_weekly_short)
    "custom_weekly" -> stringResource(R.string.mobile_create_repeat_custom_weekly_short)
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

private fun templateRecurrenceWeekdayDefaults(recurrence: MobileTemplateRecurrence?): List<String> {
    if (recurrence?.type != "custom_weekly") {
        return emptyList()
    }

    return recurrence.weekdays
        .filter { recurrenceWeekdayOrder.contains(it) }
        .distinct()
}

private fun weekdayTokenForEpochMillis(value: Long): String {
    return when (Instant.ofEpochMilli(value).atZone(ZoneId.systemDefault()).dayOfWeek) {
        DayOfWeek.MONDAY -> "MONDAY"
        DayOfWeek.TUESDAY -> "TUESDAY"
        DayOfWeek.WEDNESDAY -> "WEDNESDAY"
        DayOfWeek.THURSDAY -> "THURSDAY"
        DayOfWeek.FRIDAY -> "FRIDAY"
        DayOfWeek.SATURDAY -> "SATURDAY"
        DayOfWeek.SUNDAY -> "SUNDAY"
    }
}

@Composable
private fun weekdayShortLabel(weekday: String): String {
    val locale = Locale.getDefault()
    val dayOfWeek = when (weekday) {
        "MONDAY" -> DayOfWeek.MONDAY
        "TUESDAY" -> DayOfWeek.TUESDAY
        "WEDNESDAY" -> DayOfWeek.WEDNESDAY
        "THURSDAY" -> DayOfWeek.THURSDAY
        "FRIDAY" -> DayOfWeek.FRIDAY
        "SATURDAY" -> DayOfWeek.SATURDAY
        else -> DayOfWeek.SUNDAY
    }
    return dayOfWeek.getDisplayName(TextStyle.SHORT, locale)
}

private fun formatApiTimestamp(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(value)
}

private fun formatByteSize(value: Long): String {
    if (value < 1024L) {
        return "${numberFormatter.format(value)} B"
    }
    val units = arrayOf("KB", "MB", "GB", "TB")
    var size = value.toDouble() / 1024.0
    var index = 0
    while (size >= 1024.0 && index < units.lastIndex) {
        size /= 1024.0
        index += 1
    }
    val digits = when {
        size >= 100.0 -> 0
        size >= 10.0 -> 1
        else -> 2
    }
    return "%.${digits}f %s".format(Locale.getDefault(), size, units[index])
}

private fun formatUsageSummary(
    used: Long?,
    limit: Long?,
    formatter: (Long) -> String = { numberFormatter.format(it) }
): String {
    if (used == null) {
        return "n/a / ${limit?.let(formatter) ?: "unlimited"}"
    }
    if (limit == null || limit <= 0L) {
        return "${formatter(used)} / unlimited"
    }
    val percentage = ((used.toDouble() / limit.toDouble()) * 100.0).toInt().coerceIn(0, 100)
    return "${formatter(used)} / ${formatter(limit)} ($percentage%)"
}

private fun formatRetentionSummary(
    auditRetentionDays: Int?,
    exportRetentionDays: Int?,
    proofRetentionDays: Int?
): String {
    fun normalize(value: Int?): String {
        if (value == null || value <= 0) {
            return "n/a"
        }
        return numberFormatter.format(value)
    }
    return "${normalize(auditRetentionDays)} / ${normalize(exportRetentionDays)} / ${normalize(proofRetentionDays)}"
}

private fun detectLeadingQuickLogIcon(text: String): String? {
    val token = text.trim().split(Regex("\\s+")).firstOrNull().orEmpty()
    if (quickLogIconOptions.contains(token)) {
        return token
    }
    if (quickLogLegacyMojibakePrefix.containsMatchIn(token)) {
        return quickLogIconCheck
    }
    return null
}

private fun detectLeadingChoreIconToken(text: String): String? {
    val match = Regex("^\\[\\[icon:([a-z0-9_]+)\\]\\]", RegexOption.IGNORE_CASE).find(text.trim()) ?: return null
    return match.groupValues.getOrNull(1)?.lowercase(Locale.getDefault())
}

private fun stripLeadingChoreIconToken(text: String): String {
    return text.trim().replace(Regex("^\\[\\[icon:[a-z0-9_]+\\]\\]\\s*", RegexOption.IGNORE_CASE), "")
}

private fun resolveChoreIconDrawableFromToken(iconId: String?): Int? = when (iconId) {
    "take_out_trash" -> R.drawable.chore_icon_take_out_trash
    "recycle_sorting" -> R.drawable.chore_icon_recycle_sorting
    "feed_pets" -> R.drawable.chore_icon_feed_pets
    "wash_dishes_sink" -> R.drawable.chore_icon_wash_dishes_sink
    "make_bed" -> R.drawable.chore_icon_make_bed
    "change_bed_sheets" -> R.drawable.chore_icon_change_bed_sheets
    "do_laundry" -> R.drawable.chore_icon_do_laundry
    "vacuum_floor" -> R.drawable.chore_icon_vacuum_floor
    "water_plants" -> R.drawable.chore_icon_water_plants
    "clean_toilet" -> R.drawable.chore_icon_clean_toilet
    "clean_mirror_sink" -> R.drawable.chore_icon_clean_mirror_sink
    "wipe_counter" -> R.drawable.chore_icon_wipe_counter
    "dishwasher" -> R.drawable.chore_icon_dishwasher
    "grocery_shopping" -> R.drawable.chore_icon_grocery_shopping
    "sort_mail" -> R.drawable.chore_icon_sort_mail
    else -> null
}

private fun resolveChoreIconDrawable(title: String, context: String? = null, subtype: String? = null): Int? {
    val explicitToken = detectLeadingChoreIconToken(title)
    resolveChoreIconDrawableFromToken(explicitToken)?.let { return it }

    val searchable = listOfNotNull(stripLeadingChoreIconToken(stripLeadingQuickLogIcon(title)), context, subtype)
        .joinToString(" ")
        .lowercase(Locale.getDefault())
    return when {
        Regex("(trash|garbage|bin|waste)").containsMatchIn(searchable) -> R.drawable.chore_icon_take_out_trash
        Regex("(recycl)").containsMatchIn(searchable) -> R.drawable.chore_icon_recycle_sorting
        Regex("(pet|cat|dog|litter)").containsMatchIn(searchable) -> R.drawable.chore_icon_feed_pets
        Regex("(dish|kitchen|plate|sink)").containsMatchIn(searchable) -> R.drawable.chore_icon_wash_dishes_sink
        Regex("(bed|sheet|blanket)").containsMatchIn(searchable) -> R.drawable.chore_icon_make_bed
        Regex("(laundry|clothes|linen|towel|wash)").containsMatchIn(searchable) -> R.drawable.chore_icon_do_laundry
        Regex("(vacuum)").containsMatchIn(searchable) -> R.drawable.chore_icon_vacuum_floor
        Regex("(plant|garden|water)").containsMatchIn(searchable) -> R.drawable.chore_icon_water_plants
        Regex("(bathroom|toilet)").containsMatchIn(searchable) -> R.drawable.chore_icon_clean_toilet
        Regex("(grocery|shop|market)").containsMatchIn(searchable) -> R.drawable.chore_icon_grocery_shopping
        else -> null
    }
}

private fun stripLeadingQuickLogIcon(text: String): String {
    val trimmed = text.trim()
    val token = detectLeadingQuickLogIcon(trimmed) ?: return trimmed
    return trimmed.removePrefix(token).trimStart()
}

private fun applyChoreIconTokenToTitle(text: String, iconId: String?): String {
    val stripped = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(text))
    if (stripped.isBlank()) return ""
    if (iconId.isNullOrBlank()) return stripped
    return "[[icon:$iconId]] $stripped"
}

private fun resolveChoreIconIdFromTitle(title: String, context: String? = null): String? {
    detectLeadingChoreIconToken(title)?.let { return it }
    val searchable = listOfNotNull(
        stripLeadingChoreIconToken(stripLeadingQuickLogIcon(title)), context
    ).joinToString(" ").lowercase(Locale.getDefault())
    return when {
        Regex("(trash|garbage|bin|waste)").containsMatchIn(searchable) -> "take_out_trash"
        Regex("(recycl)").containsMatchIn(searchable) -> "recycle_sorting"
        Regex("(pet|cat|dog|litter)").containsMatchIn(searchable) -> "feed_pets"
        Regex("(dish|kitchen|plate|sink)").containsMatchIn(searchable) -> "wash_dishes_sink"
        Regex("(bed|sheet|blanket)").containsMatchIn(searchable) -> "make_bed"
        Regex("(laundry|clothes|linen|towel|wash)").containsMatchIn(searchable) -> "do_laundry"
        Regex("(vacuum)").containsMatchIn(searchable) -> "vacuum_floor"
        Regex("(plant|garden|water)").containsMatchIn(searchable) -> "water_plants"
        Regex("(bathroom|toilet)").containsMatchIn(searchable) -> "clean_toilet"
        Regex("(grocery|shop|market)").containsMatchIn(searchable) -> "grocery_shopping"
        else -> null
    }
}


private fun formatDueAtForMockCard(value: String): String {
    return runCatching {
        val zoneId = ZoneId.systemDefault()
        val dueDate = Instant.parse(value).atZone(zoneId).toLocalDate()
        val today = LocalDate.now(zoneId)
        when (dueDate) {
            today -> "Due today"
            today.plusDays(1) -> "Due tomorrow"
            else -> "Due ${DateTimeFormatter.ofPattern("MMM d", Locale.getDefault()).format(dueDate)}"
        }
    }.getOrDefault(formatDueAtForCard(value))
}

private fun isDueSoonForMockCard(value: String): Boolean {
    return runCatching {
        Instant.parse(value) <= Instant.now().plus(36, ChronoUnit.HOURS)
    }.getOrDefault(false)
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

private fun fetchGitHubLatestRelease(): GitHubReleaseInfo? {
    // Releases use tag format "v{VERSION}" (e.g. "v0.65.8") with a
    // "taskbandit-{VERSION}.apk" asset attached to every release by CI.
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

private fun downloadAndInstallApk(
    context: android.content.Context,
    url: String,
    version: String,
    onProgress: (Float) -> Unit,
    onDone: () -> Unit,
    onError: () -> Unit
) {
    val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
    try {
        val dir = java.io.File(context.cacheDir, "apk-downloads").also { it.mkdirs() }
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
        val fileUri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(installIntent)
    } catch (_: Exception) {
        mainHandler.post { onError() }
    }
}
