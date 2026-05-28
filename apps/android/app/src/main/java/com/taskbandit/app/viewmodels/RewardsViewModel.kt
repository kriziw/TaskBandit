package com.taskbandit.app.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// ── Rewards UI interaction state ─────────────────────────────────────────────

data class RewardsUiState(
    val activeTab: String = "shop",           // "shop" | "history" | "manage"
    val showRewardEditor: Boolean = false,
    val editingRewardId: String? = null,
    val rejectRedemptionId: String? = null,
)

// ── ViewModel ────────────────────────────────────────────────────────────────

class RewardsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(RewardsUiState())
    val uiState: StateFlow<RewardsUiState> = _uiState.asStateFlow()

    fun setActiveTab(tab: String) =
        _uiState.update { it.copy(activeTab = tab) }

    fun setShowRewardEditor(show: Boolean, rewardId: String? = null) =
        _uiState.update { it.copy(showRewardEditor = show, editingRewardId = rewardId) }

    fun setRejectRedemptionId(id: String?) =
        _uiState.update { it.copy(rejectRedemptionId = id) }
}
