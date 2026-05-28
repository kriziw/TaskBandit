package com.taskbandit.app.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// ── Settings UI interaction state ────────────────────────────────────────────

data class SettingsUiState(
    val activeSection: String? = null,    // which accordion section is open
    val showTechnicalDetails: Boolean = false,
)

// ── ViewModel ────────────────────────────────────────────────────────────────

class SettingsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun setActiveSection(section: String?) =
        _uiState.update { it.copy(activeSection = section) }

    fun setShowTechnicalDetails(show: Boolean) =
        _uiState.update { it.copy(showTechnicalDetails = show) }
}
