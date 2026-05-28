@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.taskbandit.app.R
import com.taskbandit.app.mobile.CreateChoreTemplateInput
import com.taskbandit.app.mobile.CreateTemplateChecklistItemInput
import com.taskbandit.app.mobile.CreateTemplateVariantInput
import com.taskbandit.app.mobile.MobileChoreTemplate
import com.taskbandit.app.mobile.MobileTemplateDependencyRule
import com.taskbandit.app.mobile.MobileTemplateTranslation
import com.taskbandit.app.mobile.MobileVariantLabelTranslation
import java.util.Locale

@Composable
internal fun TemplateManagerScreen(
    templates: List<MobileChoreTemplate>,
    isLoading: Boolean,
    error: String?,
    allTemplates: List<MobileChoreTemplate>,
    onRefresh: () -> Unit,
    onCreateTemplate: (CreateChoreTemplateInput) -> Unit,
    onUpdateTemplate: (String, CreateChoreTemplateInput) -> Unit,
    onDeleteTemplate: (String) -> Unit,
    onResetToDefaults: () -> Unit,
    canManageTemplates: Boolean,
    isAdmin: Boolean
) {
    LaunchedEffect(Unit) { onRefresh() }

    var searchQuery by rememberSaveable { mutableStateOf("") }
    var selectedGroup by rememberSaveable { mutableStateOf<String?>(null) }
    var editingTemplate by remember { mutableStateOf<MobileChoreTemplate?>(null) }
    var showEditor by rememberSaveable { mutableStateOf(false) }
    var deleteConfirmTemplate by remember { mutableStateOf<MobileChoreTemplate?>(null) }
    var showResetConfirm by rememberSaveable { mutableStateOf(false) }

    val allGroups = remember(templates) { templates.map { it.groupTitle }.distinct().sorted() }
    val filteredTemplates = remember(templates, searchQuery, selectedGroup) {
        templates.filter { t ->
            (searchQuery.isBlank() || t.title.contains(searchQuery, ignoreCase = true) || t.groupTitle.contains(searchQuery, ignoreCase = true)) &&
            (selectedGroup == null || t.groupTitle == selectedGroup)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            SectionIntro(
                title = stringResource(R.string.mobile_template_manager_title),
                body = stringResource(R.string.mobile_template_manager_hint),
                compact = true
            )

            // Search + New Template row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text(stringResource(R.string.mobile_template_search), style = MaterialTheme.typography.bodyMedium) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp)
                )
                if (canManageTemplates) {
                    OutlinedButton(onClick = { editingTemplate = null; showEditor = true }) {
                        Icon(Icons.Rounded.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                }
            }

            // Group filter chips
            if (allGroups.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedGroup == null,
                        onClick = { selectedGroup = null },
                        label = { Text(stringResource(R.string.mobile_template_all_groups)) }
                    )
                    allGroups.forEach { group ->
                        FilterChip(
                            selected = selectedGroup == group,
                            onClick = { selectedGroup = if (selectedGroup == group) null else group },
                            label = { Text(group) }
                        )
                    }
                }
            }

            // Loading / Error / List
            when {
                isLoading -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                error != null -> {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                }
                filteredTemplates.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.mobile_template_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(24.dp)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredTemplates, key = { it.id }) { template ->
                            TemplateCard(
                                template = template,
                                onClick = { editingTemplate = template; showEditor = true }
                            )
                        }
                    }
                }
            }

            // Reset to defaults (admin only)
            if (isAdmin && canManageTemplates) {
                TextButton(
                    onClick = { showResetConfirm = true },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text(stringResource(R.string.mobile_template_reset_to_defaults), color = MaterialTheme.colorScheme.error)
                }
            }
        }

        // Editor overlay
        AnimatedVisibility(
            visible = showEditor,
            enter = slideInVertically(initialOffsetY = { it }),
            exit = slideOutVertically(targetOffsetY = { it })
        ) {
            Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                TemplateEditorScreen(
                    template = editingTemplate,
                    allTemplates = allTemplates,
                    onSave = { input ->
                        val id = editingTemplate?.id
                        if (id != null) onUpdateTemplate(id, input) else onCreateTemplate(input)
                        showEditor = false
                    },
                    onDelete = { deleteConfirmTemplate = editingTemplate; showEditor = false },
                    onBack = { showEditor = false }
                )
            }
        }
    }

    // Delete confirmation
    deleteConfirmTemplate?.let { toDelete ->
        AlertDialog(
            onDismissRequest = { deleteConfirmTemplate = null },
            title = { Text(toDelete.title) },
            text = { Text(stringResource(R.string.mobile_template_delete_confirm)) },
            confirmButton = {
                Button(
                    onClick = { onDeleteTemplate(toDelete.id); deleteConfirmTemplate = null },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text(stringResource(R.string.mobile_common_delete)) }
            },
            dismissButton = {
                OutlinedButton(onClick = { deleteConfirmTemplate = null }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
        )
    }

    // Reset confirmation
    if (showResetConfirm) {
        AlertDialog(
            onDismissRequest = { showResetConfirm = false },
            title = { Text(stringResource(R.string.mobile_template_reset_to_defaults)) },
            text = { Text(stringResource(R.string.mobile_template_reset_confirm)) },
            confirmButton = {
                Button(
                    onClick = { onResetToDefaults(); showResetConfirm = false },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text(stringResource(R.string.mobile_template_reset_to_defaults)) }
            },
            dismissButton = {
                OutlinedButton(onClick = { showResetConfirm = false }) {
                    Text(stringResource(R.string.mobile_common_cancel))
                }
            }
        )
    }
}

@Composable
internal fun TemplateCard(
    template: MobileChoreTemplate,
    onClick: () -> Unit
) {
    val difficultyColor = when (template.difficulty) {
        "easy" -> Color(0xFFFFC94A)
        "hard" -> Color(0xFFE53935)
        else   -> Color(0xFFFF7A6B)
    }
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(template.title, style = MaterialTheme.typography.titleMedium)
                Text(template.groupTitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (template.checklist.isNotEmpty()) {
                    Text(
                        text = stringResource(R.string.mobile_template_steps, template.checklist.size),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // Difficulty badge
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = difficultyColor.copy(alpha = 0.18f)
                ) {
                    Text(
                        text = when (template.difficulty) {
                            "easy" -> stringResource(R.string.mobile_template_difficulty_easy)
                            "hard" -> stringResource(R.string.mobile_template_difficulty_hard)
                            else -> stringResource(R.string.mobile_template_difficulty_medium)
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = difficultyColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                // Locale indicators
                val locales = template.translations.map { it.locale }.filter { it != template.defaultLocale }
                if (locales.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        locales.forEach { locale ->
                            Text(
                                text = locale.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier
                                    .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun TemplateEditorScreen(
    template: MobileChoreTemplate?,
    allTemplates: List<MobileChoreTemplate>,
    onSave: (CreateChoreTemplateInput) -> Unit,
    onDelete: () -> Unit,
    onBack: () -> Unit
) {
    // Ã¢â€â‚¬Ã¢â€â‚¬ Locale tab state Ã¢â€â‚¬Ã¢â€â‚¬
    var editingLocale by rememberSaveable { mutableStateOf("en") }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Core fields Ã¢â€â‚¬Ã¢â€â‚¬
    var editGroupTitle by rememberSaveable { mutableStateOf(template?.groupTitle ?: "") }
    var editTitle by rememberSaveable { mutableStateOf(template?.title ?: "") }
    var editDescription by rememberSaveable { mutableStateOf(template?.description ?: "") }
    var editDifficulty by rememberSaveable { mutableStateOf(template?.difficulty ?: "medium") }
    var editAssignmentStrategy by rememberSaveable { mutableStateOf(template?.assignmentStrategy ?: "round_robin") }
    var editDefaultLocale by rememberSaveable { mutableStateOf(template?.defaultLocale ?: "en") }
    var editRecurrenceType by rememberSaveable { mutableStateOf(template?.recurrence?.type ?: "none") }
    var editRecurrenceIntervalDays by rememberSaveable { mutableStateOf(template?.recurrence?.intervalDays?.toString() ?: "") }
    var editRecurrenceWeekdays by rememberSaveable { mutableStateOf(template?.recurrence?.weekdays ?: emptyList()) }
    var editRequirePhotoProof by rememberSaveable { mutableStateOf(template?.requirePhotoProof ?: false) }
    var editStickyFollowUpAssignee by rememberSaveable { mutableStateOf(template?.stickyFollowUpAssignee ?: false) }
    var editRecurrenceStartStrategy by rememberSaveable { mutableStateOf(template?.recurrenceStartStrategy ?: "due_at") }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Translations Ã¢â€â‚¬Ã¢â€â‚¬
    var editTranslations by remember { mutableStateOf(template?.translations ?: emptyList()) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Checklist Ã¢â€â‚¬Ã¢â€â‚¬
    var editChecklist by remember { mutableStateOf(
        template?.checklist?.map { CreateTemplateChecklistItemInput(it.title, it.required) } ?: emptyList()
    ) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Variants Ã¢â€â‚¬Ã¢â€â‚¬
    var editVariants by remember { mutableStateOf(
        template?.variants?.map { CreateTemplateVariantInput(it.id, it.label, it.translations) } ?: emptyList()
    ) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Dependency rules Ã¢â€â‚¬Ã¢â€â‚¬
    var editDependencyRules by remember { mutableStateOf(template?.dependencyRules ?: emptyList()) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Section expansion state Ã¢â€â‚¬Ã¢â€â‚¬
    var recurrenceExpanded by rememberSaveable { mutableStateOf(false) }
    var checklistExpanded by rememberSaveable { mutableStateOf(false) }
    var variantsExpanded by rememberSaveable { mutableStateOf(false) }
    var followupsExpanded by rememberSaveable { mutableStateOf(false) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Dropdown expansion state Ã¢â€â‚¬Ã¢â€â‚¬
    var difficultyExpanded by remember { mutableStateOf(false) }
    var strategyExpanded by remember { mutableStateOf(false) }
    var defaultLocaleExpanded by remember { mutableStateOf(false) }
    var recurrenceTypeExpanded by remember { mutableStateOf(false) }
    var recurrenceStartExpanded by remember { mutableStateOf(false) }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Locale helpers Ã¢â€â‚¬Ã¢â€â‚¬
    fun getLocaleText(field: String): String {
        if (editingLocale == "en") return when (field) {
            "groupTitle" -> editGroupTitle; "title" -> editTitle; else -> editDescription
        }
        val t = editTranslations.firstOrNull { it.locale == editingLocale }
        return when (field) {
            "groupTitle" -> t?.groupTitle ?: ""; "title" -> t?.title ?: ""; else -> t?.description ?: ""
        }
    }
    fun setLocaleText(field: String, value: String) {
        if (editingLocale == "en") {
            when (field) { "groupTitle" -> editGroupTitle = value; "title" -> editTitle = value; else -> editDescription = value }
            return
        }
        val updated = editTranslations.toMutableList()
        val idx = updated.indexOfFirst { it.locale == editingLocale }
        val existing = if (idx >= 0) updated[idx] else MobileTemplateTranslation(locale = editingLocale)
        val next = when (field) {
            "groupTitle" -> existing.copy(groupTitle = value)
            "title" -> existing.copy(title = value)
            else -> existing.copy(description = value)
        }
        if (idx >= 0) updated[idx] = next else updated.add(next)
        editTranslations = updated
    }

    fun buildInput() = CreateChoreTemplateInput(
        groupTitle = editGroupTitle,
        title = editTitle,
        description = editDescription,
        difficulty = editDifficulty,
        assignmentStrategy = editAssignmentStrategy,
        recurrenceType = editRecurrenceType,
        recurrenceIntervalDays = editRecurrenceIntervalDays.toIntOrNull(),
        recurrenceWeekdays = editRecurrenceWeekdays,
        requirePhotoProof = editRequirePhotoProof,
        stickyFollowUpAssignee = editStickyFollowUpAssignee,
        recurrenceStartStrategy = editRecurrenceStartStrategy,
        defaultLocale = editDefaultLocale,
        translations = editTranslations,
        checklist = editChecklist,
        variants = editVariants,
        dependencyRules = editDependencyRules
    )

    val weekdayKeys = listOf("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")
    val weekdayLabels = listOf("M", "T", "W", "T", "F", "S", "S")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (template == null) stringResource(R.string.mobile_template_editor_new) else template.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = stringResource(R.string.mobile_back_label))
                    }
                },
                actions = {
                    if (template != null) {
                        IconButton(onClick = onDelete) {
                            Icon(Icons.Rounded.Close, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Ã¢â€â‚¬Ã¢â€â‚¬ Locale tab row Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("en", "de", "hu").forEach { locale ->
                        val isSelected = editingLocale == locale
                        if (isSelected) {
                            Button(onClick = {}, modifier = Modifier.weight(1f)) { Text(locale.uppercase()) }
                        } else {
                            OutlinedButton(onClick = { editingLocale = locale }, modifier = Modifier.weight(1f)) { Text(locale.uppercase()) }
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Section 1: Core fields Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = getLocaleText("groupTitle"),
                            onValueChange = { setLocaleText("groupTitle", it) },
                            label = { Text(stringResource(R.string.mobile_template_field_group)) },
                            modifier = Modifier.fillMaxWidth(), singleLine = true
                        )
                        OutlinedTextField(
                            value = getLocaleText("title"),
                            onValueChange = { setLocaleText("title", it) },
                            label = { Text(stringResource(R.string.mobile_template_field_title)) },
                            modifier = Modifier.fillMaxWidth(), singleLine = true
                        )
                        OutlinedTextField(
                            value = getLocaleText("description"),
                            onValueChange = { setLocaleText("description", it) },
                            label = { Text(stringResource(R.string.mobile_template_field_description)) },
                            modifier = Modifier.fillMaxWidth(), maxLines = 4
                        )
                        // Difficulty dropdown
                        ExposedDropdownMenuBox(expanded = difficultyExpanded, onExpandedChange = { difficultyExpanded = it }) {
                            OutlinedTextField(
                                value = when (editDifficulty) {
                                    "easy" -> stringResource(R.string.mobile_template_difficulty_easy)
                                    "hard" -> stringResource(R.string.mobile_template_difficulty_hard)
                                    else -> stringResource(R.string.mobile_template_difficulty_medium)
                                },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(stringResource(R.string.mobile_template_field_difficulty)) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = difficultyExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = difficultyExpanded, onDismissRequest = { difficultyExpanded = false }) {
                                listOf("easy" to R.string.mobile_template_difficulty_easy,
                                    "medium" to R.string.mobile_template_difficulty_medium,
                                    "hard" to R.string.mobile_template_difficulty_hard).forEach { (key, resId) ->
                                    DropdownMenuItem(text = { Text(stringResource(resId)) }, onClick = { editDifficulty = key; difficultyExpanded = false })
                                }
                            }
                        }
                        // Assignment strategy dropdown
                        ExposedDropdownMenuBox(expanded = strategyExpanded, onExpandedChange = { strategyExpanded = it }) {
                            OutlinedTextField(
                                value = when (editAssignmentStrategy) {
                                    "least_completed_recently" -> stringResource(R.string.mobile_template_strategy_least_completed)
                                    "highest_streak" -> stringResource(R.string.mobile_template_strategy_highest_streak)
                                    else -> stringResource(R.string.mobile_template_strategy_round_robin)
                                },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(stringResource(R.string.mobile_template_field_assignment)) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = strategyExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = strategyExpanded, onDismissRequest = { strategyExpanded = false }) {
                                listOf("round_robin" to R.string.mobile_template_strategy_round_robin,
                                    "least_completed_recently" to R.string.mobile_template_strategy_least_completed,
                                    "highest_streak" to R.string.mobile_template_strategy_highest_streak).forEach { (key, resId) ->
                                    DropdownMenuItem(text = { Text(stringResource(resId)) }, onClick = { editAssignmentStrategy = key; strategyExpanded = false })
                                }
                            }
                        }
                        // Default locale dropdown
                        ExposedDropdownMenuBox(expanded = defaultLocaleExpanded, onExpandedChange = { defaultLocaleExpanded = it }) {
                            OutlinedTextField(
                                value = editDefaultLocale.uppercase(),
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(stringResource(R.string.mobile_template_field_default_locale)) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = defaultLocaleExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = defaultLocaleExpanded, onDismissRequest = { defaultLocaleExpanded = false }) {
                                listOf("en", "de", "hu").forEach { locale ->
                                    DropdownMenuItem(text = { Text(locale.uppercase()) }, onClick = { editDefaultLocale = locale; defaultLocaleExpanded = false })
                                }
                            }
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Section 2: Recurrence (collapsible) Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                TemplateEditorSection(
                    title = stringResource(R.string.mobile_template_section_recurrence),
                    expanded = recurrenceExpanded,
                    onToggle = { recurrenceExpanded = !recurrenceExpanded }
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        ExposedDropdownMenuBox(expanded = recurrenceTypeExpanded, onExpandedChange = { recurrenceTypeExpanded = it }) {
                            OutlinedTextField(
                                value = when (editRecurrenceType) {
                                    "daily" -> stringResource(R.string.mobile_template_recurrence_daily)
                                    "weekly" -> stringResource(R.string.mobile_template_recurrence_weekly)
                                    "every_x_days" -> stringResource(R.string.mobile_template_recurrence_every_x_days)
                                    "custom_weekly" -> stringResource(R.string.mobile_template_recurrence_custom_weekly)
                                    else -> stringResource(R.string.mobile_template_recurrence_none)
                                },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(stringResource(R.string.mobile_template_field_recurrence_type)) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = recurrenceTypeExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = recurrenceTypeExpanded, onDismissRequest = { recurrenceTypeExpanded = false }) {
                                listOf("none" to R.string.mobile_template_recurrence_none,
                                    "daily" to R.string.mobile_template_recurrence_daily,
                                    "weekly" to R.string.mobile_template_recurrence_weekly,
                                    "every_x_days" to R.string.mobile_template_recurrence_every_x_days,
                                    "custom_weekly" to R.string.mobile_template_recurrence_custom_weekly).forEach { (key, resId) ->
                                    DropdownMenuItem(text = { Text(stringResource(resId)) }, onClick = { editRecurrenceType = key; recurrenceTypeExpanded = false })
                                }
                            }
                        }
                        if (editRecurrenceType == "every_x_days") {
                            OutlinedTextField(
                                value = editRecurrenceIntervalDays,
                                onValueChange = { editRecurrenceIntervalDays = it },
                                label = { Text(stringResource(R.string.mobile_template_field_recurrence_interval)) },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true
                            )
                        }
                        if (editRecurrenceType == "weekly" || editRecurrenceType == "custom_weekly") {
                            Text(stringResource(R.string.mobile_template_field_recurrence_weekdays), style = MaterialTheme.typography.labelMedium)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                weekdayKeys.forEachIndexed { index, key ->
                                    val selected = editRecurrenceWeekdays.contains(key)
                                    FilterChip(
                                        selected = selected,
                                        onClick = {
                                            editRecurrenceWeekdays = if (selected)
                                                editRecurrenceWeekdays.filter { it != key }
                                            else editRecurrenceWeekdays + key
                                        },
                                        label = { Text(weekdayLabels[index]) }
                                    )
                                }
                            }
                        }
                        ExposedDropdownMenuBox(expanded = recurrenceStartExpanded, onExpandedChange = { recurrenceStartExpanded = it }) {
                            OutlinedTextField(
                                value = if (editRecurrenceStartStrategy == "completed_at")
                                    stringResource(R.string.mobile_template_recurrence_start_completed_at)
                                else stringResource(R.string.mobile_template_recurrence_start_due_at),
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(stringResource(R.string.mobile_template_field_recurrence_start)) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = recurrenceStartExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = recurrenceStartExpanded, onDismissRequest = { recurrenceStartExpanded = false }) {
                                DropdownMenuItem(text = { Text(stringResource(R.string.mobile_template_recurrence_start_due_at)) }, onClick = { editRecurrenceStartStrategy = "due_at"; recurrenceStartExpanded = false })
                                DropdownMenuItem(text = { Text(stringResource(R.string.mobile_template_recurrence_start_completed_at)) }, onClick = { editRecurrenceStartStrategy = "completed_at"; recurrenceStartExpanded = false })
                            }
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(R.string.mobile_template_field_photo_proof), style = MaterialTheme.typography.bodyMedium)
                            Switch(checked = editRequirePhotoProof, onCheckedChange = { editRequirePhotoProof = it })
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(R.string.mobile_template_field_sticky_assignee), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            Switch(checked = editStickyFollowUpAssignee, onCheckedChange = { editStickyFollowUpAssignee = it })
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Section 3: Checklist (collapsible) Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                TemplateEditorSection(
                    title = stringResource(R.string.mobile_template_section_checklist),
                    expanded = checklistExpanded,
                    onToggle = { checklistExpanded = !checklistExpanded }
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        editChecklist.forEachIndexed { index, item ->
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = item.title,
                                    onValueChange = { newTitle ->
                                        val updated = editChecklist.toMutableList()
                                        updated[index] = item.copy(title = newTitle)
                                        editChecklist = updated
                                    },
                                    modifier = Modifier.weight(1f),
                                    label = { Text(stringResource(R.string.mobile_template_checklist_item_label)) },
                                    singleLine = true
                                )
                                Checkbox(
                                    checked = item.required,
                                    onCheckedChange = { checked ->
                                        val updated = editChecklist.toMutableList()
                                        updated[index] = item.copy(required = checked)
                                        editChecklist = updated
                                    }
                                )
                                IconButton(onClick = { editChecklist = editChecklist.filterIndexed { i, _ -> i != index } }) {
                                    Icon(Icons.Rounded.Close, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                        TextButton(onClick = { editChecklist = editChecklist + CreateTemplateChecklistItemInput("", false) }) {
                            Text(stringResource(R.string.mobile_template_add_checklist_item))
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Section 4: Variants (collapsible, collapsed by default) Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                TemplateEditorSection(
                    title = stringResource(R.string.mobile_template_section_variants),
                    expanded = variantsExpanded,
                    onToggle = { variantsExpanded = !variantsExpanded }
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        editVariants.forEachIndexed { index, variant ->
                            val localeLabel = if (editingLocale == "en") variant.label
                            else variant.translations.firstOrNull { it.locale == editingLocale }?.label ?: ""
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = localeLabel,
                                    onValueChange = { newLabel ->
                                        val updated = editVariants.toMutableList()
                                        if (editingLocale == "en") {
                                            updated[index] = variant.copy(label = newLabel)
                                        } else {
                                            val translations = variant.translations.toMutableList()
                                            val tIdx = translations.indexOfFirst { it.locale == editingLocale }
                                            if (tIdx >= 0) translations[tIdx] = translations[tIdx].copy(label = newLabel)
                                            else translations.add(MobileVariantLabelTranslation(editingLocale, newLabel))
                                            updated[index] = variant.copy(translations = translations)
                                        }
                                        editVariants = updated
                                    },
                                    modifier = Modifier.weight(1f),
                                    label = { Text(stringResource(R.string.mobile_template_variant_label)) },
                                    singleLine = true
                                )
                                IconButton(onClick = { editVariants = editVariants.filterIndexed { i, _ -> i != index } }) {
                                    Icon(Icons.Rounded.Close, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                        TextButton(onClick = { editVariants = editVariants + CreateTemplateVariantInput(label = "") }) {
                            Text(stringResource(R.string.mobile_template_add_variant))
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Section 5: Follow-up dependencies (collapsible, collapsed by default) Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                TemplateEditorSection(
                    title = stringResource(R.string.mobile_template_section_followups),
                    expanded = followupsExpanded,
                    onToggle = { followupsExpanded = !followupsExpanded }
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        editDependencyRules.forEachIndexed { index, rule ->
                            var delayUnitExpanded by remember { mutableStateOf(false) }
                            var followupTemplateExpanded by remember { mutableStateOf(false) }
                            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(stringResource(R.string.mobile_template_followup_template), style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(1f))
                                        IconButton(onClick = { editDependencyRules = editDependencyRules.filterIndexed { i, _ -> i != index } }) {
                                            Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.error)
                                        }
                                    }
                                    ExposedDropdownMenuBox(expanded = followupTemplateExpanded, onExpandedChange = { followupTemplateExpanded = it }) {
                                        OutlinedTextField(
                                            value = allTemplates.firstOrNull { it.id == rule.templateId }?.title ?: rule.templateId,
                                            onValueChange = {},
                                            readOnly = true,
                                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = followupTemplateExpanded) },
                                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                                            singleLine = true
                                        )
                                        ExposedDropdownMenu(expanded = followupTemplateExpanded, onDismissRequest = { followupTemplateExpanded = false }) {
                                            allTemplates.filter { it.id != template?.id }.forEach { t ->
                                                DropdownMenuItem(text = { Text(t.title) }, onClick = {
                                                    val updated = editDependencyRules.toMutableList()
                                                    updated[index] = rule.copy(templateId = t.id)
                                                    editDependencyRules = updated
                                                    followupTemplateExpanded = false
                                                })
                                            }
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(
                                            value = rule.delayValue.toString(),
                                            onValueChange = { v ->
                                                val updated = editDependencyRules.toMutableList()
                                                updated[index] = rule.copy(delayValue = v.toIntOrNull() ?: 1)
                                                editDependencyRules = updated
                                            },
                                            label = { Text(stringResource(R.string.mobile_template_followup_delay_value)) },
                                            modifier = Modifier.weight(1f),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                        ExposedDropdownMenuBox(expanded = delayUnitExpanded, onExpandedChange = { delayUnitExpanded = it }, modifier = Modifier.weight(1f)) {
                                            OutlinedTextField(
                                                value = if (rule.delayUnit == "hours") stringResource(R.string.mobile_template_delay_hours) else stringResource(R.string.mobile_template_delay_days),
                                                onValueChange = {},
                                                readOnly = true,
                                                label = { Text(stringResource(R.string.mobile_template_followup_delay_unit)) },
                                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = delayUnitExpanded) },
                                                modifier = Modifier.fillMaxWidth().menuAnchor()
                                            )
                                            ExposedDropdownMenu(expanded = delayUnitExpanded, onDismissRequest = { delayUnitExpanded = false }) {
                                                DropdownMenuItem(text = { Text(stringResource(R.string.mobile_template_delay_hours)) }, onClick = {
                                                    val updated = editDependencyRules.toMutableList(); updated[index] = rule.copy(delayUnit = "hours"); editDependencyRules = updated; delayUnitExpanded = false
                                                })
                                                DropdownMenuItem(text = { Text(stringResource(R.string.mobile_template_delay_days)) }, onClick = {
                                                    val updated = editDependencyRules.toMutableList(); updated[index] = rule.copy(delayUnit = "days"); editDependencyRules = updated; delayUnitExpanded = false
                                                })
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        TextButton(onClick = {
                            val firstOtherId = allTemplates.firstOrNull { it.id != template?.id }?.id ?: ""
                            editDependencyRules = editDependencyRules + MobileTemplateDependencyRule(firstOtherId, 1, "days")
                        }) {
                            Text(stringResource(R.string.mobile_template_add_followup))
                        }
                    }
                }
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Save button Ã¢â€â‚¬Ã¢â€â‚¬
            item {
                Button(
                    onClick = {
                        if (editTitle.isNotBlank() && editGroupTitle.isNotBlank()) {
                            onSave(buildInput())
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = editTitle.isNotBlank() && editGroupTitle.isNotBlank()
                ) {
                    Text(stringResource(R.string.mobile_template_save))
                }
                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@Composable
internal fun TemplateEditorSection(
    title: String,
    expanded: Boolean,
    onToggle: () -> Unit,
    content: @Composable () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onToggle() },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, style = MaterialTheme.typography.titleSmall)
                Icon(
                    imageVector = if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                    contentDescription = null
                )
            }
            AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(top = 12.dp)) { content() }
            }
        }
    }
}

