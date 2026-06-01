@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ContentResolver
import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.AssignmentTurnedIn
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.HowToReg
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.taskbandit.app.R
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.MobileChoreSubmissionDraft
import com.taskbandit.app.mobile.MobileChoreTemplate
import com.taskbandit.app.mobile.MobileFeatureAccess
import com.taskbandit.app.mobile.MobileHostedSubscriptionOverview
import com.taskbandit.app.mobile.MobileTakeoverRequest
import com.taskbandit.app.mobile.MobileTemplateRecurrence
import com.taskbandit.app.mobile.MobileUploadedProof
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditOutboxStore
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.viewmodels.MobileCompletionCelebration
import com.taskbandit.app.viewmodels.MobileCompletionCelebrationVariant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale
import java.util.UUID
import kotlin.random.Random

// ── Quick-log icon token constants ───────────────────────────────────────────
internal val quickLogIconCheck = "✅"
internal val quickLogIconBroom = String(Character.toChars(0x1F9F9))
internal val quickLogIconBasket = String(Character.toChars(0x1F9FA))
internal val quickLogIconTrash = String(Character.toChars(0x1F5D1))
internal val quickLogIconPlate = String(Character.toChars(0x1F37D))
internal val quickLogIconBath = String(Character.toChars(0x1F6C1))
internal val quickLogIconTeddy = String(Character.toChars(0x1F9F8))
internal val quickLogIconCart = String(Character.toChars(0x1F6D2))
internal val quickLogIconBox = String(Character.toChars(0x1F4E6))
internal val quickLogIconSparkle = "✨"
internal val quickLogLegacyMojibakePrefix = Regex("^[\\u00C3\\u00E2\\u00F0]")

internal val quickLogIconOptions = listOf(
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

internal fun LazyListScope.mockMobileChoreSection(
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
internal fun MockMobileSectionHeader(
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
internal fun MockMobileCompletedSectionHeader(
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

internal fun LazyListScope.mockMobileHistoricChoreSection(
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
@Composable
internal fun ChoreSectionPanel(
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
internal fun rememberSectionToneColors(tone: MobileChoreSectionTone): SectionToneColors {
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

internal data class SectionToneColors(
    val container: Color,
    val content: Color,
    val badgeContainer: Color,
    val badgeContent: Color,
    val borderColor: Color
)

@Composable
internal fun CompactChoreMeta(
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
internal fun TakeoverRequestsPanel(
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
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = request.choreTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = buildString {
                            append(firstNameFromDisplayName(request.requester.displayName)
                                ?: request.requester.displayName)
                            append(" · ")
                            append(formatApiTimestamp(request.createdAt))
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { approveConfirmRequestId = request.id },
                            enabled = activeTakeoverRequestAction == null,
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
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
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
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
internal fun HistoricChoreCard(
    chore: MobileChore,
    expanded: Boolean,
    onExpandedChange: () -> Unit
) {
    val statusLabel = chore.state.replace('_', ' ')
    val baseTypeTitle = chore.typeTitle.ifBlank { chore.title }
    val choreIconDrawable = resolveChoreIconDrawable(baseTypeTitle, chore.groupTitle)
    val typeTitle = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(baseTypeTitle))
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
}

@Composable
internal fun ChoreCard(
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
}

@Composable
internal fun CompletionCelebrationDialog(
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
internal fun CelebrationConfettiBurst(
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
internal fun MobileChoiceRow(options: List<MobileChoiceOption>) {
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

internal fun resolveChoreSection(chore: MobileChore, currentUserId: String?): MobileChoreSection = when {
    chore.assigneeId != null && chore.assigneeId == currentUserId -> MobileChoreSection.MINE
    chore.assigneeId.isNullOrBlank() -> MobileChoreSection.UNASSIGNED
    else -> MobileChoreSection.OTHERS
}

internal enum class MobileMyChoreDueBucket {
    OVERDUE,
    TODAY,
    THIS_WEEK,
    LATER
}

internal fun resolveMyChoreDueBucket(
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

internal fun choreSectionRank(section: MobileChoreSection): Int = when (section) {
    MobileChoreSection.MINE -> 0
    MobileChoreSection.UNASSIGNED -> 1
    MobileChoreSection.OTHERS -> 2
}

internal fun parseInstantForSort(value: String): Instant = runCatching { Instant.parse(value) }.getOrDefault(Instant.MAX)
@Composable
internal fun describeChoreAssignment(chore: MobileChore, currentUserId: String?): String = when (resolveChoreSection(chore, currentUserId)) {
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
internal fun describeAssignmentReason(reason: String?): String? = when (reason) {
    "round_robin" -> stringResource(R.string.mobile_assignment_reason_round_robin)
    "least_completed_recently" -> stringResource(R.string.mobile_assignment_reason_least_completed)
    "highest_streak" -> stringResource(R.string.mobile_assignment_reason_highest_streak)
    "manual" -> stringResource(R.string.mobile_assignment_reason_manual)
    "claimed" -> stringResource(R.string.mobile_assignment_reason_claimed)
    "sticky_follow_up" -> stringResource(R.string.mobile_assignment_reason_sticky_follow_up)
    "rebalanced" -> stringResource(R.string.mobile_assignment_reason_rebalanced)
    else -> null
}

internal fun firstNameFromDisplayName(displayName: String?): String? =
    displayName
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?.split(Regex("\\s+"))
        ?.firstOrNull()

internal fun initialsFromDisplayName(displayName: String): String {
    val tokens = displayName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
    if (tokens.isEmpty()) {
        return "U"
    }
    return tokens.joinToString("") { token -> token.first().uppercaseChar().toString() }
}

internal fun loadImageBitmapFromUri(
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

internal fun normalizeSubtypeLabel(value: String?): String? =
    value
        ?.trim()
        ?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }

internal fun defaultCreateDueAtMillis(): Long =
    Instant.now()
        .plus(4, ChronoUnit.HOURS)
        .truncatedTo(ChronoUnit.MINUTES)
        .toEpochMilli()

internal fun defaultCreateRecurrenceEndsAtMillis(baseDueAtMillis: Long = defaultCreateDueAtMillis()): Long =
    Instant.ofEpochMilli(baseDueAtMillis)
        .atZone(ZoneId.systemDefault())
        .plusWeeks(4)
        .toInstant()
        .toEpochMilli()

internal fun formatEpochMillisForDisplay(value: Long): String =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(value))

internal fun resolveEffectiveCreateRecurrenceType(
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
internal fun assignmentStrategyLabel(value: String): String = when (value) {
    "least_completed_recently" -> stringResource(R.string.mobile_create_assignment_least_completed)
    "highest_streak" -> stringResource(R.string.mobile_create_assignment_highest_streak)
    else -> stringResource(R.string.mobile_create_assignment_round_robin)
}

@Composable
internal fun recurrenceTypeLabel(value: String): String = when (value) {
    "none" -> stringResource(R.string.mobile_create_repeat_no)
    "daily" -> stringResource(R.string.mobile_create_repeat_daily_short)
    "weekly" -> stringResource(R.string.mobile_create_repeat_weekly_short)
    "custom_weekly" -> stringResource(R.string.mobile_create_repeat_custom_weekly_short)
    "every_x_days" -> stringResource(R.string.mobile_create_repeat_every_x_days_option)
    "monthly" -> stringResource(R.string.mobile_create_repeat_monthly_short)
    else -> stringResource(R.string.mobile_create_repeat_template_short)
}

internal fun templateRecurrenceDefaults(recurrence: MobileTemplateRecurrence): Pair<String, Int> = when (recurrence.type) {
    "daily" -> "daily" to 1
    "weekly" -> "weekly" to 7
    "monthly" -> "monthly" to 30
    "every_x_days" -> "every_x_days" to (recurrence.intervalDays ?: 7)
    "custom_weekly" -> "template" to 7
    else -> "none" to 1
}

internal fun templateRecurrenceWeekdayDefaults(recurrence: MobileTemplateRecurrence?): List<String> {
    if (recurrence?.type != "custom_weekly") {
        return emptyList()
    }

    return recurrence.weekdays
        .filter { recurrenceWeekdayOrder.contains(it) }
        .distinct()
}

internal fun weekdayTokenForEpochMillis(value: Long): String {
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
internal fun weekdayShortLabel(weekday: String): String {
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

internal fun formatApiTimestamp(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(value)
}
internal fun detectLeadingQuickLogIcon(text: String): String? {
    val token = text.trim().split(Regex("\\s+")).firstOrNull().orEmpty()
    if (quickLogIconOptions.contains(token)) {
        return token
    }
    if (quickLogLegacyMojibakePrefix.containsMatchIn(token)) {
        return quickLogIconCheck
    }
    return null
}

internal fun detectLeadingChoreIconToken(text: String): String? {
    val match = Regex("^\\[\\[icon:([a-z0-9_]+)\\]\\]", RegexOption.IGNORE_CASE).find(text.trim()) ?: return null
    return match.groupValues.getOrNull(1)?.lowercase(Locale.getDefault())
}

internal fun stripLeadingChoreIconToken(text: String): String {
    return text.trim().replace(Regex("^\\[\\[icon:[a-z0-9_]+\\]\\]\\s*", RegexOption.IGNORE_CASE), "")
}

internal fun resolveChoreIconDrawableFromToken(iconId: String?): Int? = when (iconId) {
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

internal fun resolveChoreIconDrawable(title: String, context: String? = null, subtype: String? = null): Int? {
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

internal fun stripLeadingQuickLogIcon(text: String): String {
    val trimmed = text.trim()
    val token = detectLeadingQuickLogIcon(trimmed) ?: return trimmed
    return trimmed.removePrefix(token).trimStart()
}

internal fun applyChoreIconTokenToTitle(text: String, iconId: String?): String {
    val stripped = stripLeadingChoreIconToken(stripLeadingQuickLogIcon(text))
    if (stripped.isBlank()) return ""
    if (iconId.isNullOrBlank()) return stripped
    return "[[icon:$iconId]] $stripped"
}

internal fun resolveChoreIconIdFromTitle(title: String, context: String? = null): String? {
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


internal fun formatDueAtForMockCard(value: String): String {
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

internal fun isDueSoonForMockCard(value: String): Boolean {
    return runCatching {
        Instant.parse(value) <= Instant.now().plus(36, ChronoUnit.HOURS)
    }.getOrDefault(false)
}
internal fun formatDueAtForCard(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("EEEE d MMM HH:mm", Locale.getDefault())
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(formatApiTimestamp(value))
}

internal fun formatDueAtForHistoricCard(value: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("d MMM HH:mm", Locale.getDefault())
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrDefault(formatApiTimestamp(value))
}

internal suspend fun flushQueuedSubmissions(
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

internal fun submitDraft(
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

internal data class ProofInput(
    val filename: String,
    val contentType: String,
    val bytes: ByteArray
)

internal fun readProofInput(contentResolver: ContentResolver, uriString: String): ProofInput {
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

internal fun readUriDisplayName(contentResolver: ContentResolver, uri: Uri): String {
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
