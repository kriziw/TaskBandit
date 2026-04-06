package com.taskbandit.app.mobile

data class TaskBanditSession(
    val baseUrl: String,
    val token: String?
)

data class MobileUser(
    val id: String,
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
    val assigneeId: String? = null,
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

data class MobileNotificationDeviceRegistration(
    val installationId: String,
    val deviceName: String,
    val provider: String = "generic",
    val pushToken: String? = null,
    val appVersion: String? = null,
    val locale: String? = null,
    val notificationsEnabled: Boolean = true
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

data class MobileNotificationDevice(
    val id: String,
    val installationId: String,
    val provider: String,
    val pushTokenConfigured: Boolean,
    val deviceName: String?,
    val appVersion: String?,
    val locale: String?,
    val notificationsEnabled: Boolean,
    val lastSeenAt: String
)

data class MobileReleaseInfo(
    val releaseVersion: String,
    val buildNumber: String,
    val commitSha: String
)

data class MobileHouseholdMember(
    val id: String,
    val displayName: String,
    val role: String
)

data class MobileTemplateRecurrence(
    val type: String,
    val intervalDays: Int?,
    val weekdays: List<String>
)

data class MobileChoreTemplate(
    val id: String,
    val title: String,
    val description: String,
    val assignmentStrategy: String,
    val recurrence: MobileTemplateRecurrence,
    val requirePhotoProof: Boolean
)

data class MobileDashboard(
    val user: MobileUser,
    val pendingApprovals: Int,
    val activeChores: Int,
    val streakLeader: String,
    val leaderboard: List<MobileLeaderboardEntry>,
    val chores: List<MobileChore>,
    val notifications: List<MobileNotification>,
    val members: List<MobileHouseholdMember>,
    val templates: List<MobileChoreTemplate>
)
