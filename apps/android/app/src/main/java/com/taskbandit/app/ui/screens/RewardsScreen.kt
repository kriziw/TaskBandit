@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.taskbandit.app.R
import com.taskbandit.app.mobile.CreateRewardInput
import com.taskbandit.app.mobile.MobileRedemption
import com.taskbandit.app.mobile.MobileReward
import com.taskbandit.app.mobile.UpdateRewardInput

internal fun rewardCategoryEmoji(category: String): String = when (category) {
    "SCREEN_TIME" -> "📱"
    "ALLOWANCE"   -> "💰"
    "TREAT"       -> "🍬"
    "ACTIVITY"    -> "🎉"
    "PRIVILEGE"   -> "⭐"
    else          -> "🎁"
}

@Composable
internal fun RewardCategorySection(
    category: String,
    rewards: List<MobileReward>,
    onEditReward: (MobileReward) -> Unit,
    onToggleReward: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(true) }
    val catLabel = when (category.uppercase()) {
        "SCREEN_TIME" -> stringResource(R.string.mobile_rewards_category_screen_time)
        "ALLOWANCE"   -> stringResource(R.string.mobile_rewards_category_allowance)
        "TREAT"       -> stringResource(R.string.mobile_rewards_category_treat)
        "ACTIVITY"    -> stringResource(R.string.mobile_rewards_category_activity)
        "PRIVILEGE"   -> stringResource(R.string.mobile_rewards_category_privilege)
        else          -> stringResource(R.string.mobile_rewards_category_custom)
    }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }.padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(rewardCategoryEmoji(category), style = MaterialTheme.typography.titleMedium)
                Text(catLabel, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                Icon(if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, contentDescription = null)
            }
            AnimatedVisibility(visible = expanded) {
                Column {
                    HorizontalDivider()
                    rewards.forEach { reward ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = reward.icon ?: rewardCategoryEmoji(reward.category),
                                style = MaterialTheme.typography.titleMedium
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(reward.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text("${reward.pointCost} pts", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = reward.isEnabled,
                                onCheckedChange = { onToggleReward(reward.id) },
                                enabled = !reward.isOperatorManaged
                            )
                            IconButton(onClick = { onEditReward(reward) }) {
                                Icon(Icons.Rounded.MoreVert, contentDescription = null)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun RewardsManagerScreen(
    allRewards: List<MobileReward>,
    pendingRedemptions: List<MobileRedemption>,
    currentUserPoints: Int,
    isAdmin: Boolean = true,
    onCreateReward: (CreateRewardInput) -> Unit,
    onUpdateReward: (String, UpdateRewardInput) -> Unit,
    onDeleteReward: (String) -> Unit,
    onToggleReward: (String) -> Unit,
    onApproveRedemption: (String) -> Unit,
    onRejectRedemption: (String, String?) -> Unit,
    onRedeemReward: (String, String?) -> Unit,
    onRescheduleRedemption: (String, String) -> Unit
) {
    var activeTab by rememberSaveable { mutableStateOf("shop") }
    var selectedReward by remember { mutableStateOf<MobileReward?>(null) }
    var showRewardEditor by rememberSaveable { mutableStateOf(false) }
    var rejectRedemptionId by remember { mutableStateOf<String?>(null) }
    var deleteConfirmReward by remember { mutableStateOf<MobileReward?>(null) }

    val categoryOrder = listOf("SCREEN_TIME", "ALLOWANCE", "TREAT", "ACTIVITY", "PRIVILEGE", "CUSTOM")
    val groupedRewards = remember(allRewards) { allRewards.groupBy { it.category.uppercase() } }
    val sortedCategories = remember(groupedRewards) {
        categoryOrder.filter { groupedRewards.containsKey(it) } +
            groupedRewards.keys.filter { it !in categoryOrder }
    }

    Column(modifier = Modifier
        .fillMaxWidth()
        .verticalScroll(rememberScrollState())
    ) {
        SectionIntro(
            title = stringResource(R.string.mobile_rewards_manager_title),
            body = stringResource(R.string.mobile_rewards_manager_hint),
            compact = true,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )

        // Tab row — Shop | Catalogue (admin only) | Approvals
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (activeTab == "shop") {
                Button(onClick = {}, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.mobile_rewards_manager_shop_tab), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                }
            } else {
                OutlinedButton(onClick = { activeTab = "shop" }, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.mobile_rewards_manager_shop_tab), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                }
            }
            if (isAdmin) {
                if (activeTab == "catalogue") {
                    Button(onClick = {}, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.mobile_rewards_manager_catalogue_tab), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                    }
                } else {
                    OutlinedButton(onClick = { activeTab = "catalogue" }, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.mobile_rewards_manager_catalogue_tab), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                    }
                }
            }
            val approvalsText = if (pendingRedemptions.isNotEmpty())
                "${stringResource(R.string.mobile_rewards_manager_approvals_tab)} (${pendingRedemptions.size})"
            else stringResource(R.string.mobile_rewards_manager_approvals_tab)
            if (activeTab == "approvals") {
                Button(onClick = {}, modifier = Modifier.weight(1f)) {
                    Text(approvalsText, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                }
            } else {
                OutlinedButton(onClick = { activeTab = "approvals" }, modifier = Modifier.weight(1f)) {
                    Text(approvalsText, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, softWrap = false)
                }
            }
        }

        if (activeTab == "shop") {
            val shopRewards = remember(allRewards) {
                allRewards.filter { it.isEnabled && (it.eligibility == "ALL" || it.eligibility == "ADULT_ONLY") }
            }
            Text(
                text = stringResource(R.string.mobile_rewards_your_balance, currentUserPoints),
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
            if (shopRewards.isEmpty()) {
                Text(
                    text = stringResource(R.string.mobile_rewards_manager_shop_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(24.dp)
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    shopRewards.forEach { reward ->
                        val isExclusive = reward.workflowType == "DAILY_EXCLUSIVE"
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    if (!reward.icon.isNullOrBlank()) {
                                        Text(reward.icon, style = MaterialTheme.typography.headlineSmall)
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(reward.title, style = MaterialTheme.typography.titleSmall)
                                        Text(
                                            text = "${reward.pointCost} ${stringResource(R.string.mobile_rewards_pts)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Button(
                                        onClick = { onRedeemReward(reward.id, null) },
                                        enabled = currentUserPoints >= reward.pointCost
                                    ) {
                                        Text(stringResource(R.string.mobile_rewards_redeem))
                                    }
                                }
                                if (isExclusive) {
                                    reward.upcomingClaims.forEach { claim ->
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                text = "${formatBookingDate(claim.targetDate)} · ${claim.displayName}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.weight(1f)
                                            )
                                            TextButton(
                                                onClick = { onRescheduleRedemption(claim.redemptionId, claim.targetDate) },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                                            ) {
                                                Text(stringResource(R.string.mobile_rewards_reschedule), style = MaterialTheme.typography.labelSmall)
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

        if (activeTab == "catalogue") {
            OutlinedButton(
                onClick = { selectedReward = null; showRewardEditor = true },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
            ) { Text(stringResource(R.string.mobile_rewards_add_custom)) }

            if (allRewards.isEmpty()) {
                Text(
                    text = stringResource(R.string.mobile_rewards_catalogue_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(24.dp)
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    sortedCategories.forEach { category ->
                        val rewards = groupedRewards[category] ?: return@forEach
                        RewardCategorySection(
                            category = category,
                            rewards = rewards,
                            onEditReward = { reward -> selectedReward = reward; showRewardEditor = true },
                            onToggleReward = onToggleReward
                        )
                    }
                }
            }
        } else {
            // Approvals tab
            if (pendingRedemptions.isEmpty()) {
                Text(
                    text = stringResource(R.string.mobile_rewards_no_pending),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(24.dp)
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pendingRedemptions.forEach { redemption ->
                        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(redemption.rewardTitle, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = "${redemption.requestedByName} · ${redemption.pointsDeducted} pts" +
                                        (if (redemption.targetDate != null) " · ${formatBookingDate(redemption.targetDate)}" else ""),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = { onApproveRedemption(redemption.id) },
                                        modifier = Modifier.weight(1f)
                                    ) { Text(stringResource(R.string.mobile_rewards_approve)) }
                                    OutlinedButton(
                                        onClick = { rejectRedemptionId = redemption.id },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                                    ) { Text(stringResource(R.string.mobile_rewards_reject)) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Reward editor sheet
    if (showRewardEditor) {
        RewardEditorSheet(
            reward = selectedReward,
            onSave = { input ->
                val id = selectedReward?.id
                if (id != null) {
                    onUpdateReward(id, UpdateRewardInput(
                        title = input.title,
                        description = input.description,
                        category = input.category,
                        icon = input.icon,
                        pointCost = input.pointCost,
                        maxRedemptionsPerChild = input.maxRedemptionsPerChild,
                        cooldownDays = input.cooldownDays,
                        eligibility = input.eligibility,
                        workflowType = input.workflowType
                    ))
                } else {
                    onCreateReward(input)
                }
                showRewardEditor = false
            },
            onDelete = { deleteConfirmReward = selectedReward; showRewardEditor = false },
            onDismiss = { showRewardEditor = false }
        )
    }

    // Reject dialog
    rejectRedemptionId?.let { rid ->
        RejectRedemptionDialog(
            onConfirm = { note -> onRejectRedemption(rid, note.ifBlank { null }); rejectRedemptionId = null },
            onDismiss = { rejectRedemptionId = null }
        )
    }

    // Delete reward confirmation
    deleteConfirmReward?.let { reward ->
        AlertDialog(
            onDismissRequest = { deleteConfirmReward = null },
            title = { Text(reward.title) },
            text = { Text(stringResource(R.string.mobile_rewards_delete_confirm)) },
            confirmButton = {
                Button(
                    onClick = { onDeleteReward(reward.id); deleteConfirmReward = null },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text(stringResource(R.string.mobile_rewards_delete)) }
            },
            dismissButton = {
                OutlinedButton(onClick = { deleteConfirmReward = null }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
        )
    }
}

@Composable
internal fun RewardEditorSheet(
    reward: MobileReward?,
    onSave: (CreateRewardInput) -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var editTitle by rememberSaveable { mutableStateOf(reward?.title ?: "") }
    var editDescription by rememberSaveable { mutableStateOf(reward?.description ?: "") }
    var editCategory by rememberSaveable { mutableStateOf(reward?.category?.uppercase() ?: "CUSTOM") }
    var editIcon by rememberSaveable { mutableStateOf(reward?.icon ?: "") }
    var editPointCost by rememberSaveable { mutableStateOf(reward?.pointCost?.toString() ?: "") }
    var editEligibility by rememberSaveable { mutableStateOf(reward?.eligibility ?: "ALL") }
    var editMaxPerChild by rememberSaveable { mutableStateOf(reward?.maxRedemptionsPerChild?.toString() ?: "") }
    var editCooldownDays by rememberSaveable { mutableStateOf(reward?.cooldownDays?.toString() ?: "") }
    var editWorkflowType by rememberSaveable { mutableStateOf(reward?.workflowType ?: "STANDARD") }
    var workflowExpanded by remember { mutableStateOf(false) }
    var categoryExpanded by remember { mutableStateOf(false) }
    val isOperatorManaged = reward?.isOperatorManaged == true

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (reward == null) stringResource(R.string.mobile_rewards_new_title)
                       else stringResource(R.string.mobile_rewards_edit_title),
                style = MaterialTheme.typography.titleMedium
            )

            if (isOperatorManaged) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = stringResource(R.string.mobile_rewards_operator_managed),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            OutlinedTextField(
                value = editTitle,
                onValueChange = { if (!isOperatorManaged) editTitle = it },
                label = { Text(stringResource(R.string.mobile_rewards_field_title)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isOperatorManaged
            )
            OutlinedTextField(
                value = editDescription,
                onValueChange = { if (!isOperatorManaged) editDescription = it },
                label = { Text(stringResource(R.string.mobile_rewards_field_description)) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3,
                enabled = !isOperatorManaged
            )

            // Category dropdown
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { if (!isOperatorManaged) categoryExpanded = it }
            ) {
                val catLabel = when (editCategory.uppercase()) {
                    "SCREEN_TIME" -> stringResource(R.string.mobile_rewards_category_screen_time)
                    "ALLOWANCE"   -> stringResource(R.string.mobile_rewards_category_allowance)
                    "TREAT"       -> stringResource(R.string.mobile_rewards_category_treat)
                    "ACTIVITY"    -> stringResource(R.string.mobile_rewards_category_activity)
                    "PRIVILEGE"   -> stringResource(R.string.mobile_rewards_category_privilege)
                    else          -> stringResource(R.string.mobile_rewards_category_custom)
                }
                OutlinedTextField(
                    value = catLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.mobile_rewards_field_category)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    enabled = !isOperatorManaged
                )
                ExposedDropdownMenu(expanded = categoryExpanded, onDismissRequest = { categoryExpanded = false }) {
                    listOf(
                        "SCREEN_TIME" to R.string.mobile_rewards_category_screen_time,
                        "ALLOWANCE"   to R.string.mobile_rewards_category_allowance,
                        "TREAT"       to R.string.mobile_rewards_category_treat,
                        "ACTIVITY"    to R.string.mobile_rewards_category_activity,
                        "PRIVILEGE"   to R.string.mobile_rewards_category_privilege,
                        "CUSTOM"      to R.string.mobile_rewards_category_custom
                    ).forEach { (cat, labelRes) ->
                        DropdownMenuItem(
                            text = { Text(stringResource(labelRes)) },
                            onClick = { editCategory = cat; categoryExpanded = false }
                        )
                    }
                }
            }

            // Icon emoji selector
            if (!isOperatorManaged) {
                val iconOptions = listOf(
                    "📱", "💰", "🍫", "🍕", "🍦", "🍬", "🎮", "🎬",
                    "🏃", "🎨", "📚", "⭐", "🌟", "👑", "🏆", "🎁", "🎉", "🚀"
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        stringResource(R.string.mobile_rewards_field_icon),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // "None" chip
                        FilterChip(
                            selected = editIcon.isBlank(),
                            onClick = { editIcon = "" },
                            label = { Text(stringResource(R.string.mobile_rewards_icon_none)) }
                        )
                        iconOptions.forEach { emoji ->
                            FilterChip(
                                selected = editIcon == emoji,
                                onClick = { editIcon = emoji },
                                label = { Text(emoji, style = MaterialTheme.typography.titleMedium) }
                            )
                        }
                    }
                }
            }
            OutlinedTextField(
                value = editPointCost,
                onValueChange = { if (!isOperatorManaged) editPointCost = it },
                label = { Text(stringResource(R.string.mobile_rewards_field_cost)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                enabled = !isOperatorManaged
            )

            // Eligibility segmented buttons
            Text(stringResource(R.string.mobile_rewards_field_eligibility), style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "ALL"        to R.string.mobile_rewards_eligibility_all,
                    "CHILD_ONLY" to R.string.mobile_rewards_eligibility_child,
                    "ADULT_ONLY" to R.string.mobile_rewards_eligibility_adult
                ).forEach { (key, labelRes) ->
                    if (editEligibility == key) {
                        Button(onClick = {}, modifier = Modifier.weight(1f), enabled = !isOperatorManaged) {
                            Text(stringResource(labelRes), maxLines = 1, style = MaterialTheme.typography.labelSmall)
                        }
                    } else {
                        OutlinedButton(
                            onClick = { if (!isOperatorManaged) editEligibility = key },
                            modifier = Modifier.weight(1f),
                            enabled = !isOperatorManaged
                        ) {
                            Text(stringResource(labelRes), maxLines = 1, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }

            OutlinedTextField(
                value = editMaxPerChild,
                onValueChange = { editMaxPerChild = it },
                label = { Text(stringResource(R.string.mobile_rewards_field_max_per_child)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true
            )
            OutlinedTextField(
                value = editCooldownDays,
                onValueChange = { editCooldownDays = it },
                label = { Text(stringResource(R.string.mobile_rewards_field_cooldown)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true
            )

            ExposedDropdownMenuBox(
                expanded = workflowExpanded,
                onExpandedChange = { if (!isOperatorManaged) workflowExpanded = it }
            ) {
                val workflowLabel = if (editWorkflowType == "DAILY_EXCLUSIVE")
                    stringResource(R.string.mobile_rewards_workflow_daily_exclusive)
                else
                    stringResource(R.string.mobile_rewards_workflow_standard)
                OutlinedTextField(
                    value = workflowLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.mobile_rewards_field_workflow_type)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = workflowExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    enabled = !isOperatorManaged
                )
                ExposedDropdownMenu(expanded = workflowExpanded, onDismissRequest = { workflowExpanded = false }) {
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.mobile_rewards_workflow_standard)) },
                        onClick = { editWorkflowType = "STANDARD"; workflowExpanded = false }
                    )
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.mobile_rewards_workflow_daily_exclusive)) },
                        onClick = { editWorkflowType = "DAILY_EXCLUSIVE"; workflowExpanded = false }
                    )
                }
            }

            if (!isOperatorManaged) {
                Button(
                    onClick = {
                        if (editTitle.isNotBlank()) {
                            onSave(CreateRewardInput(
                                title = editTitle,
                                description = editDescription.ifBlank { null },
                                category = editCategory,
                                icon = editIcon.ifBlank { null },
                                pointCost = editPointCost.toIntOrNull() ?: 0,
                                maxRedemptionsPerChild = editMaxPerChild.toIntOrNull(),
                                cooldownDays = editCooldownDays.toIntOrNull(),
                                isEnabled = reward?.isEnabled ?: true,
                                eligibility = editEligibility,
                                workflowType = editWorkflowType
                            ))
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = editTitle.isNotBlank()
                ) { Text(stringResource(R.string.mobile_rewards_save)) }

                if (reward != null) {
                    OutlinedButton(
                        onClick = onDelete,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) { Text(stringResource(R.string.mobile_rewards_delete)) }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
internal fun RejectRedemptionDialog(
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var note by rememberSaveable { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.mobile_rewards_reject_title)) },
        text = {
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text(stringResource(R.string.mobile_rewards_reject_note_hint)) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(note) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) { Text(stringResource(R.string.mobile_rewards_reject_confirm)) }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text(stringResource(R.string.mobile_common_cancel)) }
        }
    )
}

