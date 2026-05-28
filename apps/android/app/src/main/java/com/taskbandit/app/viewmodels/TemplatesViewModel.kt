package com.taskbandit.app.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// ── Templates UI interaction state ──────────────────────────────────────────

data class TemplatesUiState(
    val searchQuery: String = "",
    val selectedGroup: String? = null,
    val showEditor: Boolean = false,
    val editingTemplateId: String? = null,
    val showDeleteConfirm: Boolean = false,
    val deleteConfirmTemplateId: String? = null,
    val showResetConfirm: Boolean = false,
)

// ── ViewModel ────────────────────────────────────────────────────────────────

class TemplatesViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(TemplatesUiState())
    val uiState: StateFlow<TemplatesUiState> = _uiState.asStateFlow()

    fun updateSearchQuery(value: String) =
        _uiState.update { it.copy(searchQuery = value) }

    fun updateSelectedGroup(value: String?) =
        _uiState.update { it.copy(selectedGroup = value) }

    fun setShowEditor(show: Boolean, templateId: String? = null) =
        _uiState.update { it.copy(showEditor = show, editingTemplateId = templateId) }

    fun setDeleteConfirm(templateId: String?) =
        _uiState.update { it.copy(showDeleteConfirm = templateId != null, deleteConfirmTemplateId = templateId) }

    fun setShowResetConfirm(show: Boolean) =
        _uiState.update { it.copy(showResetConfirm = show) }
}
