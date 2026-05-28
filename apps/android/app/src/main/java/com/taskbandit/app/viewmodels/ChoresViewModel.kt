package com.taskbandit.app.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

// ── Chore UI interaction state ───────────────────────────────────────────────

data class ChoresUiState(
    // Chore list
    val expandedChoreIds: Set<String> = emptySet(),
    val expandedHistoricChoreIds: Set<String> = emptySet(),
    val showCompletedChoresSection: Boolean = false,
    // New-UI chore dialog (modal overlay per chore)
    val activeNewUiChoreDialogId: String? = null,
    // Confirmation dialogs
    val startConfirmationChoreId: String? = null,
    val takeoverConfirmationChoreId: String? = null,
    val submitConfirmationChoreId: String? = null,
    val requestTakeoverChoreId: String? = null,
    val requestTakeoverMemberId: String? = null,
    // Quick log
    val showQuickLogDialog: Boolean = false,
    val quickLogQuery: String = "",
    val quickLogNote: String = "",
    val quickLogSelectedKind: String? = null,
    val quickLogSelectedId: String? = null,
    val quickLogIcon: String? = null,
    val quickLogCreateTemplate: Boolean = false,
    val quickLogUsePointsOverride: Boolean = false,
    val quickLogPointsOverrideInput: String = "",
    // Speed dial FAB
    val showSpeedDial: Boolean = false,
    // Create chore form
    val createDueAtMillis: Long = defaultChoreCreateDueAtMillis(),
    val createAssignmentStrategy: String = "round_robin",
    val createAssigneeId: String? = null,
    val createRecurrenceType: String = "template",
    val createRecurrenceIntervalInput: String = "7",
    val createRecurrenceWeekdays: List<String> = emptyList(),
    val createRecurrenceEndMode: String = "never",
    val createRecurrenceOccurrencesInput: String = "3",
    val createRecurrenceEndsAtMillis: Long = defaultChoreCreateRecurrenceEndsAtMillis(),
    val createVariantId: String? = null,
    val showCreateSuccessDialog: Boolean = false,
    // Create form dropdowns
    val templateGroupDropdownExpanded: Boolean = false,
    val templateDropdownExpanded: Boolean = false,
    val recurrenceTypeDropdownExpanded: Boolean = false,
    val assignmentStrategyDropdownExpanded: Boolean = false,
    val assigneeDropdownExpanded: Boolean = false,
    val variantDropdownExpanded: Boolean = false,
)

fun defaultChoreCreateDueAtMillis(): Long =
    Instant.now()
        .plus(4, ChronoUnit.HOURS)
        .truncatedTo(ChronoUnit.MINUTES)
        .toEpochMilli()

fun defaultChoreCreateRecurrenceEndsAtMillis(base: Long = defaultChoreCreateDueAtMillis()): Long =
    Instant.ofEpochMilli(base)
        .atZone(ZoneId.systemDefault())
        .plusWeeks(4)
        .toInstant()
        .toEpochMilli()

// ── ViewModel ────────────────────────────────────────────────────────────────

class ChoresViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ChoresUiState())
    val uiState: StateFlow<ChoresUiState> = _uiState.asStateFlow()

    // ── Chore list interaction ────────────────────────────────────────────

    fun setActiveNewUiChoreDialogId(id: String?) =
        _uiState.update { it.copy(activeNewUiChoreDialogId = id) }

    fun toggleExpandedChore(choreId: String) = _uiState.update { state ->
        val newSet = if (state.expandedChoreIds.contains(choreId))
            state.expandedChoreIds - choreId
        else
            state.expandedChoreIds + choreId
        state.copy(expandedChoreIds = newSet)
    }

    fun toggleExpandedHistoricChore(choreId: String) = _uiState.update { state ->
        val newSet = if (state.expandedHistoricChoreIds.contains(choreId))
            state.expandedHistoricChoreIds - choreId
        else
            state.expandedHistoricChoreIds + choreId
        state.copy(expandedHistoricChoreIds = newSet)
    }

    fun setShowCompletedChoresSection(show: Boolean) =
        _uiState.update { it.copy(showCompletedChoresSection = show) }

    // ── Confirmation dialogs ─────────────────────────────────────────────

    fun setStartConfirmationChoreId(id: String?) =
        _uiState.update { it.copy(startConfirmationChoreId = id) }

    fun setTakeoverConfirmationChoreId(id: String?) =
        _uiState.update { it.copy(takeoverConfirmationChoreId = id) }

    fun setSubmitConfirmationChoreId(id: String?) =
        _uiState.update { it.copy(submitConfirmationChoreId = id) }

    fun setRequestTakeover(choreId: String?, memberId: String?) =
        _uiState.update { it.copy(requestTakeoverChoreId = choreId, requestTakeoverMemberId = memberId) }

    // ── Quick log ────────────────────────────────────────────────────────

    fun setShowQuickLogDialog(show: Boolean) =
        _uiState.update { it.copy(showQuickLogDialog = show) }

    fun updateQuickLogQuery(value: String) =
        _uiState.update { it.copy(quickLogQuery = value) }

    fun updateQuickLogNote(value: String) =
        _uiState.update { it.copy(quickLogNote = value) }

    fun updateQuickLogSelectedKind(value: String?) =
        _uiState.update { it.copy(quickLogSelectedKind = value) }

    fun updateQuickLogSelectedId(value: String?) =
        _uiState.update { it.copy(quickLogSelectedId = value) }

    fun updateQuickLogIcon(value: String?) =
        _uiState.update { it.copy(quickLogIcon = value) }

    fun updateQuickLogCreateTemplate(value: Boolean) =
        _uiState.update { it.copy(quickLogCreateTemplate = value) }

    fun updateQuickLogUsePointsOverride(value: Boolean) =
        _uiState.update { it.copy(quickLogUsePointsOverride = value) }

    fun updateQuickLogPointsOverrideInput(value: String) =
        _uiState.update { it.copy(quickLogPointsOverrideInput = value) }

    fun clearQuickLog() = _uiState.update {
        it.copy(
            showQuickLogDialog = false,
            quickLogQuery = "",
            quickLogNote = "",
            quickLogSelectedKind = null,
            quickLogSelectedId = null,
            quickLogIcon = null,
            quickLogCreateTemplate = false,
            quickLogUsePointsOverride = false,
            quickLogPointsOverrideInput = "",
        )
    }

    // ── Speed dial ───────────────────────────────────────────────────────

    fun setShowSpeedDial(show: Boolean) =
        _uiState.update { it.copy(showSpeedDial = show) }

    // ── Create chore form ────────────────────────────────────────────────

    fun updateCreateDueAtMillis(value: Long) =
        _uiState.update { it.copy(createDueAtMillis = value) }

    fun updateCreateAssignmentStrategy(value: String) =
        _uiState.update { it.copy(createAssignmentStrategy = value) }

    fun updateCreateAssigneeId(value: String?) =
        _uiState.update { it.copy(createAssigneeId = value) }

    fun updateCreateRecurrenceType(value: String) =
        _uiState.update { it.copy(createRecurrenceType = value) }

    fun updateCreateRecurrenceIntervalInput(value: String) =
        _uiState.update { it.copy(createRecurrenceIntervalInput = value) }

    fun updateCreateRecurrenceWeekdays(value: List<String>) =
        _uiState.update { it.copy(createRecurrenceWeekdays = value) }

    fun updateCreateRecurrenceEndMode(value: String) =
        _uiState.update { it.copy(createRecurrenceEndMode = value) }

    fun updateCreateRecurrenceOccurrencesInput(value: String) =
        _uiState.update { it.copy(createRecurrenceOccurrencesInput = value) }

    fun updateCreateRecurrenceEndsAtMillis(value: Long) =
        _uiState.update { it.copy(createRecurrenceEndsAtMillis = value) }

    fun updateCreateVariantId(value: String?) =
        _uiState.update { it.copy(createVariantId = value) }

    fun setShowCreateSuccessDialog(show: Boolean) =
        _uiState.update { it.copy(showCreateSuccessDialog = show) }

    // ── Create form dropdowns ────────────────────────────────────────────

    fun setTemplateGroupDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(templateGroupDropdownExpanded = value) }

    fun setTemplateDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(templateDropdownExpanded = value) }

    fun setRecurrenceTypeDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(recurrenceTypeDropdownExpanded = value) }

    fun setAssignmentStrategyDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(assignmentStrategyDropdownExpanded = value) }

    fun setAssigneeDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(assigneeDropdownExpanded = value) }

    fun setVariantDropdownExpanded(value: Boolean) =
        _uiState.update { it.copy(variantDropdownExpanded = value) }

    fun resetCreateForm() = _uiState.update {
        it.copy(
            createDueAtMillis = defaultChoreCreateDueAtMillis(),
            createAssignmentStrategy = "round_robin",
            createAssigneeId = null,
            createRecurrenceType = "template",
            createRecurrenceIntervalInput = "7",
            createRecurrenceWeekdays = emptyList(),
            createRecurrenceEndMode = "never",
            createRecurrenceOccurrencesInput = "3",
            createRecurrenceEndsAtMillis = defaultChoreCreateRecurrenceEndsAtMillis(),
            createVariantId = null,
            showCreateSuccessDialog = false,
            templateGroupDropdownExpanded = false,
            templateDropdownExpanded = false,
            recurrenceTypeDropdownExpanded = false,
            assignmentStrategyDropdownExpanded = false,
            assigneeDropdownExpanded = false,
            variantDropdownExpanded = false,
        )
    }
}
