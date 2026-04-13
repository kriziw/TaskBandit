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
    val cycleId: String? = null,
    val title: String,
    val groupTitle: String,
    val typeTitle: String,
    val subtypeLabel: String? = null,
    val state: String,
    val assigneeId: String? = null,
    val assigneeDisplayName: String? = null,
    val dueAt: String,
    val completedAt: String? = null,
    val cancelledAt: String? = null,
    val isOverdue: Boolean,
    val requirePhotoProof: Boolean,
    val basePoints: Int = 0,
    val awardedPoints: Int = 0,
    val checklist: List<MobileChecklistItem>,
    val completedChecklistIds: List<String>,
    val variantId: String? = null
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
    val type: String,
    val title: String,
    val message: String,
    val entityType: String? = null,
    val entityId: String? = null,
    val isRead: Boolean,
    val createdAt: String
)

data class MobileTakeoverRequest(
    val id: String,
    val choreId: String,
    val choreTitle: String,
    val status: String,
    val note: String? = null,
    val createdAt: String,
    val respondedAt: String? = null,
    val requester: MobileHouseholdMember,
    val requested: MobileHouseholdMember
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

data class MobileDashboardCompatibility(
    val takeoverRequestsSupported: Boolean = true
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

data class MobileTemplateVariant(
    val id: String,
    val label: String
)

data class MobileChoreTemplate(
    val id: String,
    val groupTitle: String,
    val title: String,
    val description: String,
    val assignmentStrategy: String,
    val recurrence: MobileTemplateRecurrence,
    val requirePhotoProof: Boolean,
    val recurrenceStartStrategy: String = "due_at",
    val variants: List<MobileTemplateVariant> = emptyList()
)

data class MobileDashboard(
    val user: MobileUser,
    val pendingApprovals: Int,
    val activeChores: Int,
    val streakLeader: String,
    val leaderboard: List<MobileLeaderboardEntry>,
    val chores: List<MobileChore>,
    val takeoverRequests: List<MobileTakeoverRequest>,
    val notifications: List<MobileNotification>,
    val members: List<MobileHouseholdMember>,
    val templates: List<MobileChoreTemplate>,
    val compatibility: MobileDashboardCompatibility = MobileDashboardCompatibility()
)
