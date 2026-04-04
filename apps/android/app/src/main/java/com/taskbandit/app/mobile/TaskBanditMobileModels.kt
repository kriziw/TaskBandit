package com.taskbandit.app.mobile

data class TaskBanditSession(
    val baseUrl: String,
    val token: String?
)

data class MobileUser(
    val displayName: String,
    val role: String,
    val points: Int,
    val currentStreak: Int
)

data class MobileLeaderboardEntry(
    val displayName: String,
    val role: String,
    val points: Int,
    val currentStreak: Int
)

data class MobileChore(
    val id: String,
    val title: String,
    val state: String,
    val dueAt: String,
    val isOverdue: Boolean,
    val requirePhotoProof: Boolean,
    val checklist: List<MobileChecklistItem>,
    val completedChecklistIds: List<String>
)

data class MobileChecklistItem(
    val id: String,
    val title: String,
    val required: Boolean
)

data class MobileUploadedProof(
    val clientFilename: String,
    val contentType: String,
    val storageKey: String,
    val sizeBytes: Long
)

data class MobileChoreSubmissionDraft(
    val id: String,
    val choreId: String,
    val completedChecklistIds: List<String>,
    val proofUriStrings: List<String>,
    val note: String?,
    val queuedAtEpochMillis: Long
)

data class MobileNotification(
    val id: String,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: String
)

data class MobileDashboard(
    val user: MobileUser,
    val pendingApprovals: Int,
    val activeChores: Int,
    val streakLeader: String,
    val leaderboard: List<MobileLeaderboardEntry>,
    val chores: List<MobileChore>,
    val notifications: List<MobileNotification>
)
