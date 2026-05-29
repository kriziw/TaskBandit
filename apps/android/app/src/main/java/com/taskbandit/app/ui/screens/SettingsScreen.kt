@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app.ui.screens

import android.content.Intent
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.AssignmentTurnedIn
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.util.Locale
import androidx.core.content.FileProvider
import androidx.core.os.LocaleListCompat
import com.taskbandit.app.BuildConfig
import com.taskbandit.app.R
import com.taskbandit.app.compareReleaseVersions
import com.taskbandit.app.formatReleaseLabel
import com.taskbandit.app.mobile.MobileHostedSubscriptionOverview
import com.taskbandit.app.mobile.MobileNotificationDevice
import com.taskbandit.app.mobile.MobileReleaseInfo
import com.taskbandit.app.mobile.MobileThemeMode
import com.taskbandit.app.viewmodels.GitHubReleaseInfo
import java.text.NumberFormat

internal val numberFormatter: NumberFormat = NumberFormat.getIntegerInstance()

@Composable
internal fun SettingsSectionCard(modifier: Modifier = Modifier, icon: ImageVector, title: String, content: @Composable () -> Unit) {
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
internal fun SettingsValueLine(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelSmall)
        Text(text = value, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
internal fun CreatePanelCard(
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
internal fun CreateTemplateAndSchedulePanel(
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
internal fun CreateRecurrencePanel(
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
internal fun CreateRecurrenceEndPanel(
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
internal fun CreateAssignmentPanel(
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
internal fun CreateVariantPanel(
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
internal fun CreateSubmitPanel(
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
internal fun SettingsAppearanceContent(
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
internal fun SettingsDeviceContent(
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
internal fun SettingsReleaseContent(
    currentReleaseLabel: String,
    serverReleaseLabel: String?,
    serverUrl: String,
    availableUpdate: MobileReleaseInfo?,
    onDismissUpdate: () -> Unit,
    githubCheckDone: Boolean,
    githubCheckError: Boolean,
    githubLatestVersion: String?,
    onCheckForUpdates: () -> Unit,
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
        enabled = githubCheckDone,
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
}

@Composable
internal fun SettingsGithubUpdateCard(
    update: GitHubReleaseInfo,
    currentReleaseLabel: String,
    isDownloadingUpdate: Boolean,
    downloadProgress: Float,
    downloadError: Boolean,
    onDismissGithubUpdate: () -> Unit,
    onDownloadAndInstall: (GitHubReleaseInfo) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = stringResource(R.string.mobile_github_update_available_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                text = stringResource(R.string.mobile_github_update_available_subtitle, "v${BuildConfig.TASKBANDIT_RELEASE_VERSION}", "v${update.version}"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (update.body.isNotBlank()) {
                Text(
                    text = update.body.trim(),
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
                        onClick = { onDownloadAndInstall(update) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(stringResource(R.string.mobile_github_download_install, "v${update.version}"))
                    }
                    TextButton(onClick = onDismissGithubUpdate) {
                        Text(stringResource(R.string.mobile_update_dismiss))
                    }
                }
            }
        }
    }
}

@Composable
internal fun SettingsPlanContent(
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

internal fun formatSubscriptionStatusSummary(
    lifecycleState: String?,
    entitlementState: String?,
    billingStatus: String?
): String? = listOf(lifecycleState, entitlementState, billingStatus)
    .firstOrNull { !it.isNullOrBlank() }
    ?.replace('_', ' ')
    ?.trim()
    ?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

internal fun formatLeaderboardRoleLabel(role: String): String =
    role
        .replace('_', ' ')
        .trim()
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }

@Composable
internal fun SettingsSessionContent(
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
internal fun SettingsLogoutContent(onLogout: () -> Unit) {
    OutlinedButton(
        onClick = onLogout,
        modifier = Modifier.fillMaxWidth()
    ) { Text(stringResource(R.string.mobile_logout)) }
}

internal fun formatByteSize(value: Long): String {
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

internal fun formatUsageSummary(
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

internal fun formatRetentionSummary(
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


internal fun fetchGitHubLatestRelease(): GitHubReleaseInfo? {
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

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE MANAGER
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// REWARDS MANAGER
// ═══════════════════════════════════════════════════════════════════════════

@Composable
internal fun MoreMenuSheet(
    isCreatorRole: Boolean,
    canManageTemplates: Boolean,
    onNavigateSettings: () -> Unit,
    onNavigateTemplates: () -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).padding(bottom = 24.dp)) {
        Text(
            text = stringResource(R.string.mobile_tab_more),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        MoreMenuSheetItem(
            icon = Icons.Rounded.Tune,
            label = stringResource(R.string.mobile_tab_settings),
            onClick = onNavigateSettings
        )
        if (isCreatorRole && canManageTemplates) {
            Spacer(modifier = Modifier.height(8.dp))
            MoreMenuSheetItem(
                icon = Icons.Rounded.AssignmentTurnedIn,
                label = stringResource(R.string.mobile_more_templates),
                onClick = onNavigateTemplates
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
internal fun MoreMenuSheetItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().heightIn(min = 72.dp).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(26.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = Icons.Rounded.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
