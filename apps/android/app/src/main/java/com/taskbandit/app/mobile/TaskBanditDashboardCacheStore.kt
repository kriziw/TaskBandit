package com.taskbandit.app.mobile

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

private const val dashboardCacheSchemaVersion = 1

data class TaskBanditDashboardCacheEntry(
    val baseUrl: String,
    val cachedAtEpochMillis: Long,
    val dashboard: MobileDashboard
)

class TaskBanditDashboardCacheStore(
    private val preferences: SharedPreferences
) {
    fun save(baseUrl: String, dashboard: MobileDashboard) {
        val normalizedBaseUrl = normalizeBaseUrl(baseUrl)
        val payload = JSONObject()
            .put("version", dashboardCacheSchemaVersion)
            .put("baseUrl", normalizedBaseUrl)
            .put("cachedAtEpochMillis", System.currentTimeMillis())
            .put("dashboard", dashboardToJson(dashboard))

        preferences.edit()
            .putString("dashboard_cache", payload.toString())
            .apply()
    }

    fun read(baseUrl: String): TaskBanditDashboardCacheEntry? {
        val rawValue = preferences.getString("dashboard_cache", null) ?: return null
        val parsed = runCatching { JSONTokener(rawValue).nextValue() as? JSONObject }.getOrNull() ?: return null
        if (parsed.optInt("version", 0) != dashboardCacheSchemaVersion) {
            return null
        }

        val cachedBaseUrl = parsed.optString("baseUrl").trim()
        val normalizedCachedBaseUrl = normalizeBaseUrl(cachedBaseUrl)
        val normalizedTargetBaseUrl = normalizeBaseUrl(baseUrl)
        if (normalizedCachedBaseUrl.isNotBlank() && normalizedCachedBaseUrl != normalizedTargetBaseUrl) {
            return null
        }

        val dashboardJson = parsed.optJSONObject("dashboard") ?: return null
        val dashboard = parseDashboard(dashboardJson) ?: return null

        return TaskBanditDashboardCacheEntry(
            baseUrl = normalizedCachedBaseUrl.ifBlank { normalizedTargetBaseUrl },
            cachedAtEpochMillis = parsed.optLong("cachedAtEpochMillis"),
            dashboard = dashboard
        )
    }

    fun clear() {
        preferences.edit()
            .remove("dashboard_cache")
            .apply()
    }

    private fun normalizeBaseUrl(baseUrl: String): String = baseUrl.trim().trimEnd('/')

    // -------------------------------------------------------------------------
    // Serializers — convert model objects to JSON for storage
    // -------------------------------------------------------------------------

    private fun dashboardToJson(dashboard: MobileDashboard): JSONObject {
        return JSONObject()
            .put("user", userToJson(dashboard.user))
            .put("pendingApprovals", dashboard.pendingApprovals)
            .put("activeChores", dashboard.activeChores)
            .put("streakLeader", dashboard.streakLeader)
            .put("leaderboard", JSONArray().apply { dashboard.leaderboard.forEach { put(leaderboardEntryToJson(it)) } })
            .put("chores", JSONArray().apply { dashboard.chores.forEach { put(choreToJson(it)) } })
            .put("takeoverRequests", JSONArray().apply { dashboard.takeoverRequests.forEach { put(takeoverRequestToJson(it)) } })
            .put("notifications", JSONArray().apply { dashboard.notifications.forEach { put(notificationToJson(it)) } })
            .put("members", JSONArray().apply { dashboard.members.forEach { put(memberToJson(it)) } })
            .put("templates", JSONArray().apply { dashboard.templates.forEach { put(templateToJson(it)) } })
            .put("quickLogPointsDefault", dashboard.quickLogPointsDefault)
            .put("compatibility", compatibilityToJson(dashboard.compatibility))
    }

    private fun userToJson(user: MobileUser): JSONObject {
        return JSONObject()
            .put("id", user.id)
            .put("displayName", user.displayName)
            .put("role", user.role)
            .put("points", user.points)
            .put("currentStreak", user.currentStreak)
            .put("featureAccess", featureAccessToJson(user.featureAccess))
    }

    private fun leaderboardEntryToJson(entry: MobileLeaderboardEntry): JSONObject {
        return JSONObject()
            .put("displayName", entry.displayName)
            .put("role", entry.role)
            .put("points", entry.points)
            .put("leaderboardPoints", entry.leaderboardPoints)
            .put("currentStreak", entry.currentStreak)
    }

    private fun choreToJson(chore: MobileChore): JSONObject {
        return JSONObject()
            .put("id", chore.id)
            .put("cycleId", chore.cycleId)
            .put("occurrenceRootId", chore.occurrenceRootId)
            .put("title", chore.title)
            .put("groupTitle", chore.groupTitle)
            .put("typeTitle", chore.typeTitle)
            .put("subtypeLabel", chore.subtypeLabel)
            .put("state", chore.state)
            .put("supportsOccurrenceCancellation", chore.supportsOccurrenceCancellation)
            .put("supportsSeriesCancellation", chore.supportsSeriesCancellation)
            .put("assigneeId", chore.assigneeId)
            .put("assigneeDisplayName", chore.assigneeDisplayName)
            .put("assignmentReason", chore.assignmentReason)
            .put("dueAt", chore.dueAt)
            .put("completedAt", chore.completedAt)
            .put("cancelledAt", chore.cancelledAt)
            .put("isOverdue", chore.isOverdue)
            .put("requirePhotoProof", chore.requirePhotoProof)
            .put("basePoints", chore.basePoints)
            .put("awardedPoints", chore.awardedPoints)
            .put("checklist", JSONArray().apply { chore.checklist.forEach { put(checklistItemToJson(it)) } })
            .put("completedChecklistIds", JSONArray().apply { chore.completedChecklistIds.forEach(::put) })
            .put("variantId", chore.variantId)
            .put("templateId", chore.templateId)
            .put("completionMilestone", chore.completionMilestone?.let(::completionMilestoneToJson))
            .put("userMasteryLevel", chore.userMasteryLevel)
    }

    private fun checklistItemToJson(item: MobileChecklistItem): JSONObject {
        return JSONObject()
            .put("id", item.id)
            .put("title", item.title)
            .put("required", item.required)
    }

    private fun completionMilestoneToJson(entry: MobileCompletionMilestone): JSONObject {
        return JSONObject()
            .put("type", entry.type)
            .put("userId", entry.userId)
            .put("dayKey", entry.dayKey)
            .put("completedChoreCount", entry.completedChoreCount)
            .put("messageIndex", entry.messageIndex)
    }

    private fun takeoverRequestToJson(entry: MobileTakeoverRequest): JSONObject {
        return JSONObject()
            .put("id", entry.id)
            .put("choreId", entry.choreId)
            .put("choreTitle", entry.choreTitle)
            .put("status", entry.status)
            .put("note", entry.note)
            .put("createdAt", entry.createdAt)
            .put("respondedAt", entry.respondedAt)
            .put("requester", memberToJson(entry.requester))
            .put("requested", memberToJson(entry.requested))
    }

    private fun notificationToJson(entry: MobileNotification): JSONObject {
        return JSONObject()
            .put("id", entry.id)
            .put("type", entry.type)
            .put("title", entry.title)
            .put("message", entry.message)
            .put("entityType", entry.entityType)
            .put("entityId", entry.entityId)
            .put("isRead", entry.isRead)
            .put("createdAt", entry.createdAt)
    }

    private fun memberToJson(entry: MobileHouseholdMember): JSONObject {
        return JSONObject()
            .put("id", entry.id)
            .put("displayName", entry.displayName)
            .put("role", entry.role)
    }

    private fun templateToJson(entry: MobileChoreTemplate): JSONObject {
        return JSONObject()
            .put("id", entry.id)
            .put("groupTitle", entry.groupTitle)
            .put("title", entry.title)
            .put("description", entry.description)
            .put("assignmentStrategy", entry.assignmentStrategy)
            .put("recurrence", templateRecurrenceToJson(entry.recurrence))
            .put("requirePhotoProof", entry.requirePhotoProof)
            .put("stickyFollowUpAssignee", entry.stickyFollowUpAssignee)
            .put("recurrenceStartStrategy", entry.recurrenceStartStrategy)
            .put("variants", JSONArray().apply { entry.variants.forEach { put(templateVariantToJson(it)) } })
    }

    private fun templateRecurrenceToJson(entry: MobileTemplateRecurrence): JSONObject {
        return JSONObject()
            .put("type", entry.type)
            .put("intervalDays", entry.intervalDays)
            .put("weekdays", JSONArray().apply { entry.weekdays.forEach(::put) })
    }

    private fun templateVariantToJson(entry: MobileTemplateVariant): JSONObject {
        return JSONObject()
            .put("id", entry.id)
            .put("label", entry.label)
    }

    private fun compatibilityToJson(entry: MobileDashboardCompatibility): JSONObject {
        return JSONObject()
            .put("takeoverRequestsSupported", entry.takeoverRequestsSupported)
    }

    private fun featureAccessToJson(entry: MobileFeatureAccess): JSONObject {
        return JSONObject()
            .put("templatesManage", entry.templatesManage)
            .put("choresManage", entry.choresManage)
            .put("reassignment", entry.reassignment)
            .put("takeoverDirect", entry.takeoverDirect)
            .put("takeoverRequests", entry.takeoverRequests)
            .put("approvals", entry.approvals)
            .put("proofUploads", entry.proofUploads)
            .put("followUpAutomation", entry.followUpAutomation)
            .put("externalCompletion", entry.externalCompletion)
            .put("deferredFollowUpControl", entry.deferredFollowUpControl)
            .put("quickLog", entry.quickLog)
            .put("rewardsManage", entry.rewardsManage)
            .put("mastery", entry.mastery)
    }

    // -------------------------------------------------------------------------
    // Deserializer — rebuild MobileDashboard from cached JSON
    // Parse helpers are delegated to TaskBanditModelParsers (same package).
    // -------------------------------------------------------------------------

    private fun parseDashboard(entry: JSONObject): MobileDashboard? {
        val user = entry.optJSONObject("user")?.let(::parseUser) ?: return null
        return MobileDashboard(
            user = user,
            pendingApprovals = entry.optInt("pendingApprovals"),
            activeChores = entry.optInt("activeChores"),
            streakLeader = entry.optString("streakLeader"),
            leaderboard = parseJsonArray(entry.optJSONArray("leaderboard"), ::parseLeaderboardEntry),
            chores = parseJsonArray(entry.optJSONArray("chores"), ::parseChoreFromCache),
            takeoverRequests = parseJsonArray(entry.optJSONArray("takeoverRequests"), ::parseTakeoverRequest),
            notifications = parseJsonArray(entry.optJSONArray("notifications"), ::parseNotification),
            members = parseJsonArray(entry.optJSONArray("members"), ::parseMember),
            templates = parseFullTemplates(entry.optJSONArray("templates")),
            quickLogPointsDefault = if (entry.has("quickLogPointsDefault") && !entry.isNull("quickLogPointsDefault")) {
                entry.optInt("quickLogPointsDefault")
            } else {
                null
            },
            compatibility = entry.optJSONObject("compatibility")?.let(::parseCompatibility)
                ?: MobileDashboardCompatibility()
        )
    }
}
