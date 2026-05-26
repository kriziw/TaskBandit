package com.taskbandit.app.mobile

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TaskBanditModelParsersTest {

    // -------------------------------------------------------------------------
    // optNullableString
    // -------------------------------------------------------------------------

    @Test
    fun `optNullableString returns null for missing key`() {
        val obj = JSONObject()
        assertNull(obj.optNullableString("missingKey"))
    }

    @Test
    fun `optNullableString returns null for blank value`() {
        val obj = JSONObject().put("key", "   ")
        assertNull(obj.optNullableString("key"))
    }

    @Test
    fun `optNullableString returns null for literal null string`() {
        val obj = JSONObject().put("key", "null")
        assertNull(obj.optNullableString("key"))
    }

    @Test
    fun `optNullableString returns trimmed value for normal string`() {
        val obj = JSONObject().put("key", "  hello world  ")
        assertEquals("hello world", obj.optNullableString("key"))
    }

    @Test
    fun `optNullableString returns value for non-blank string`() {
        val obj = JSONObject().put("key", "abc")
        assertEquals("abc", obj.optNullableString("key"))
    }

    // -------------------------------------------------------------------------
    // parseStringArray
    // -------------------------------------------------------------------------

    @Test
    fun `parseStringArray returns empty list for null input`() {
        assertEquals(emptyList<String>(), parseStringArray(null))
    }

    @Test
    fun `parseStringArray returns empty list for empty array`() {
        assertEquals(emptyList<String>(), parseStringArray(JSONArray()))
    }

    @Test
    fun `parseStringArray filters blank strings`() {
        val arr = JSONArray().put("a").put("  ").put("b").put("")
        assertEquals(listOf("a", "b"), parseStringArray(arr))
    }

    @Test
    fun `parseStringArray trims whitespace from entries`() {
        val arr = JSONArray().put("  x  ").put("y")
        assertEquals(listOf("x", "y"), parseStringArray(arr))
    }

    // -------------------------------------------------------------------------
    // parseChecklistItem
    // -------------------------------------------------------------------------

    @Test
    fun `parseChecklistItem maps all fields`() {
        val json = JSONObject()
            .put("id", "ci-1")
            .put("title", "Wipe counters")
            .put("required", true)

        val item = parseChecklistItem(json)

        assertEquals("ci-1", item.id)
        assertEquals("Wipe counters", item.title)
        assertTrue(item.required)
    }

    @Test
    fun `parseChecklistItem defaults required to false when absent`() {
        val json = JSONObject().put("id", "ci-2").put("title", "Optional step")
        assertFalse(parseChecklistItem(json).required)
    }

    // -------------------------------------------------------------------------
    // parseCompletionMilestone
    // -------------------------------------------------------------------------

    @Test
    fun `parseCompletionMilestone returns null for null input`() {
        assertNull(parseCompletionMilestone(null))
    }

    @Test
    fun `parseCompletionMilestone returns null when type is blank`() {
        val json = JSONObject().put("type", "").put("userId", "u1").put("dayKey", "2025-01-01")
        assertNull(parseCompletionMilestone(json))
    }

    @Test
    fun `parseCompletionMilestone returns null when userId is blank`() {
        val json = JSONObject().put("type", "daily").put("userId", "  ").put("dayKey", "2025-01-01")
        assertNull(parseCompletionMilestone(json))
    }

    @Test
    fun `parseCompletionMilestone maps valid fields`() {
        val json = JSONObject()
            .put("type", "daily")
            .put("userId", "u-42")
            .put("dayKey", "2025-06-01")
            .put("completedChoreCount", 3)
            .put("messageIndex", 1)

        val milestone = parseCompletionMilestone(json)

        assertNotNull(milestone)
        assertEquals("daily", milestone!!.type)
        assertEquals("u-42", milestone.userId)
        assertEquals("2025-06-01", milestone.dayKey)
        assertEquals(3, milestone.completedChoreCount)
        assertEquals(1, milestone.messageIndex)
    }

    // -------------------------------------------------------------------------
    // parseChoreFromApi / parseChoreFromCache
    // -------------------------------------------------------------------------

    @Test
    fun `parseChoreFromApi reads checklistCompletionIds`() {
        val json = buildBaseChoreJson()
            .put("checklistCompletionIds", JSONArray().put("id-1").put("id-2"))
        val chore = parseChoreFromApi(json)
        assertEquals(listOf("id-1", "id-2"), chore.completedChecklistIds)
    }

    @Test
    fun `parseChoreFromCache reads completedChecklistIds`() {
        val json = buildBaseChoreJson()
            .put("completedChecklistIds", JSONArray().put("id-3"))
        val chore = parseChoreFromCache(json)
        assertEquals(listOf("id-3"), chore.completedChecklistIds)
    }

    @Test
    fun `parseChoreFromApi populates triggerInfo`() {
        val triggerJson = JSONObject()
            .put("title", "Trigger chore")
            .put("completedAt", "2025-05-01T10:00:00Z")
            .put("completedByDisplayName", "Alice")
            .put("completedByExternal", false)
            .put("externalCompleterName", "null")

        val json = buildBaseChoreJson().put("triggerInfo", triggerJson)
        val chore = parseChoreFromApi(json)

        assertNotNull(chore.triggerInfo)
        assertEquals("Trigger chore", chore.triggerInfo!!.title)
        assertEquals("Alice", chore.triggerInfo!!.completedByDisplayName)
        assertNull(chore.triggerInfo!!.externalCompleterName)
    }

    @Test
    fun `parseChoreFromCache produces null triggerInfo`() {
        val json = buildBaseChoreJson()
        val chore = parseChoreFromCache(json)
        assertNull(chore.triggerInfo)
    }

    @Test
    fun `parseChoreFromApi defaults groupTitle to General when blank`() {
        val json = buildBaseChoreJson().put("groupTitle", "")
        assertEquals("General", parseChoreFromApi(json).groupTitle)
    }

    @Test
    fun `parseChoreFromApi uses title as typeTitle when typeTitle is blank`() {
        val json = buildBaseChoreJson()
            .put("title", "My Chore")
            .put("typeTitle", "")
        assertEquals("My Chore", parseChoreFromApi(json).typeTitle)
    }

    private fun buildBaseChoreJson(): JSONObject = JSONObject()
        .put("id", "inst-1")
        .put("title", "Vacuum")
        .put("groupTitle", "Kitchen")
        .put("typeTitle", "Weekly")
        .put("state", "pending")
        .put("dueAt", "2025-06-01T08:00:00Z")
        .put("basePoints", 10)
        .put("awardedPoints", 0)
        .put("isOverdue", false)
        .put("requirePhotoProof", false)
        .put("supportsOccurrenceCancellation", false)
        .put("supportsSeriesCancellation", false)

    // -------------------------------------------------------------------------
    // parseFeatureAccessCached / parseFeatureAccessFromApi
    // -------------------------------------------------------------------------

    @Test
    fun `parseFeatureAccessCached reads camelCase keys`() {
        val json = JSONObject()
            .put("templatesManage", false)
            .put("choresManage", true)
            .put("reassignment", false)
            .put("takeoverDirect", true)
            .put("takeoverRequests", false)
            .put("approvals", true)
            .put("proofUploads", false)
            .put("followUpAutomation", true)
            .put("externalCompletion", false)
            .put("deferredFollowUpControl", true)
            .put("quickLog", false)

        val access = parseFeatureAccessCached(json)

        assertFalse(access.templatesManage)
        assertTrue(access.choresManage)
        assertFalse(access.reassignment)
        assertFalse(access.quickLog)
    }

    @Test
    fun `parseFeatureAccessFromApi reads snake_case keys`() {
        val json = JSONObject()
            .put("templates_manage", false)
            .put("chores_manage", true)
            .put("reassignment", false)
            .put("takeover_direct", true)
            .put("takeover_requests", false)
            .put("approvals", true)
            .put("proof_uploads", false)
            .put("follow_up_automation", true)
            .put("external_completion", false)
            .put("deferred_follow_up_control", true)
            .put("quick_log", false)

        val access = parseFeatureAccessFromApi(json)

        assertFalse(access.templatesManage)
        assertTrue(access.choresManage)
        assertFalse(access.takeoverDirect) // snake key takeover_direct = true → camelCase takeoverDirect
    }

    @Test
    fun `parseFeatureAccessFromApi returns defaults for null input`() {
        val access = parseFeatureAccessFromApi(null)
        assertTrue(access.templatesManage)
        assertTrue(access.quickLog)
    }

    @Test
    fun `parseFeatureAccessCached and parseFeatureAccessFromApi differ on key convention`() {
        // Putting camelCase key into snake_case reader should fall back to default (true)
        val camelJson = JSONObject().put("templatesManage", false)
        val accessViaSnake = parseFeatureAccessFromApi(camelJson)
        assertTrue(accessViaSnake.templatesManage) // default = true, snake key not found

        // Putting snake_case key into camelCase reader should fall back to default (true)
        val snakeJson = JSONObject().put("templates_manage", false)
        val accessViaCamel = parseFeatureAccessCached(snakeJson)
        assertTrue(accessViaCamel.templatesManage) // default = true, camel key not found
    }

    // -------------------------------------------------------------------------
    // parseMember / parseMembers
    // -------------------------------------------------------------------------

    @Test
    fun `parseMember maps id, displayName, role`() {
        val json = JSONObject().put("id", "m-1").put("displayName", "Alice").put("role", "admin")
        val member = parseMember(json)
        assertEquals("m-1", member.id)
        assertEquals("Alice", member.displayName)
        assertEquals("admin", member.role)
    }

    @Test
    fun `parseMembers skips entries with blank id or displayName`() {
        val arr = JSONArray()
            .put(JSONObject().put("id", "").put("displayName", "Bob").put("role", "child"))
            .put(JSONObject().put("id", "m-2").put("displayName", "").put("role", "child"))
            .put(JSONObject().put("id", "m-3").put("displayName", "Carol").put("role", "parent"))

        val members = parseMembers(arr)
        assertEquals(1, members.size)
        assertEquals("m-3", members[0].id)
    }

    // -------------------------------------------------------------------------
    // parseTakeoverRequest
    // -------------------------------------------------------------------------

    @Test
    fun `parseTakeoverRequest maps all fields`() {
        val requester = JSONObject().put("id", "u-1").put("displayName", "Alice").put("role", "child")
        val requested = JSONObject().put("id", "u-2").put("displayName", "Bob").put("role", "admin")
        val json = JSONObject()
            .put("id", "tr-1")
            .put("choreId", "ch-1")
            .put("choreTitle", "Clean")
            .put("status", "pending")
            .put("createdAt", "2025-05-01T12:00:00Z")
            .put("requester", requester)
            .put("requested", requested)

        val tr = parseTakeoverRequest(json)

        assertEquals("tr-1", tr.id)
        assertEquals("Clean", tr.choreTitle)
        assertEquals("u-1", tr.requester.id)
        assertEquals("Bob", tr.requested.displayName)
    }

    @Test
    fun `parseTakeoverRequest uses empty fallback member when requester missing`() {
        val json = JSONObject()
            .put("id", "tr-2")
            .put("choreId", "ch-2")
            .put("choreTitle", "Dishes")
            .put("status", "pending")
            .put("createdAt", "2025-05-02T12:00:00Z")
            .put("requested", JSONObject().put("id", "u-3").put("displayName", "Carol").put("role", "child"))

        val tr = parseTakeoverRequest(json)
        assertEquals("", tr.requester.id)
        assertEquals("u-3", tr.requested.id)
    }

    // -------------------------------------------------------------------------
    // parseNotification
    // -------------------------------------------------------------------------

    @Test
    fun `parseNotification maps fields and handles optional nulls`() {
        val json = JSONObject()
            .put("id", "n-1")
            .put("type", "chore_completed")
            .put("title", "Chore done")
            .put("message", "Alice completed Vacuuming")
            .put("entityType", "chore_instance")
            .put("entityId", "inst-99")
            .put("isRead", false)
            .put("createdAt", "2025-05-01T10:00:00Z")

        val notif = parseNotification(json)
        assertEquals("n-1", notif.id)
        assertEquals("chore_instance", notif.entityType)
        assertEquals("inst-99", notif.entityId)
        assertFalse(notif.isRead)
    }

    @Test
    fun `parseNotification returns null entityType when absent`() {
        val json = JSONObject()
            .put("id", "n-2")
            .put("type", "system")
            .put("title", "Info")
            .put("message", "Hello")
            .put("isRead", true)
            .put("createdAt", "2025-05-01T11:00:00Z")

        val notif = parseNotification(json)
        assertNull(notif.entityType)
        assertNull(notif.entityId)
    }

    // -------------------------------------------------------------------------
    // parseTemplateRecurrence
    // -------------------------------------------------------------------------

    @Test
    fun `parseTemplateRecurrence maps intervalDays as null when not present`() {
        val json = JSONObject().put("type", "weekly")
        val rec = parseTemplateRecurrence(json)
        assertEquals("weekly", rec.type)
        assertNull(rec.intervalDays)
    }

    @Test
    fun `parseTemplateRecurrence maps intervalDays when present`() {
        val json = JSONObject()
            .put("type", "interval")
            .put("intervalDays", 14)
            .put("weekdays", JSONArray())
        val rec = parseTemplateRecurrence(json)
        assertEquals(14, rec.intervalDays)
        assertEquals(emptyList<String>(), rec.weekdays)
    }

    @Test
    fun `parseTemplateRecurrence defaults type to none when blank`() {
        val json = JSONObject().put("type", "")
        assertEquals("none", parseTemplateRecurrence(json).type)
    }

    // -------------------------------------------------------------------------
    // parseTemplateVariant
    // -------------------------------------------------------------------------

    @Test
    fun `parseTemplateVariant maps id, label and translations`() {
        val vtArr = JSONArray()
            .put(JSONObject().put("locale", "de").put("label", "Küche"))
        val json = JSONObject()
            .put("id", "v-1")
            .put("label", "Kitchen")
            .put("translations", vtArr)

        val variant = parseTemplateVariant(json)
        assertEquals("v-1", variant.id)
        assertEquals("Kitchen", variant.label)
        assertEquals(1, variant.translations.size)
        assertEquals("de", variant.translations[0].locale)
        assertEquals("Küche", variant.translations[0].label)
    }

    @Test
    fun `parseTemplateVariant returns empty label variant when label is blank`() {
        val json = JSONObject().put("id", "v-2").put("label", "  ")
        val variant = parseTemplateVariant(json)
        assertEquals("v-2", variant.id)
        assertEquals("", variant.label)
    }

    // -------------------------------------------------------------------------
    // parseFullTemplate
    // -------------------------------------------------------------------------

    @Test
    fun `parseFullTemplate maps all core fields`() {
        val recurrence = JSONObject()
            .put("type", "weekly")
            .put("intervalDays", JSONObject.NULL)
            .put("weekdays", JSONArray().put("monday").put("friday"))

        val json = JSONObject()
            .put("id", "tmpl-1")
            .put("groupTitle", "Kitchen")
            .put("title", "Wipe Surfaces")
            .put("description", "Clean all counters")
            .put("difficulty", "easy")
            .put("basePoints", 5)
            .put("assignmentStrategy", "round_robin")
            .put("recurrence", recurrence)
            .put("requirePhotoProof", false)
            .put("stickyFollowUpAssignee", false)
            .put("recurrenceStartStrategy", "due_at")
            .put("defaultLocale", "en")
            .put("variants", JSONArray())
            .put("checklist", JSONArray())
            .put("translations", JSONArray())
            .put("dependencyRules", JSONArray())

        val template = parseFullTemplate(json)

        assertEquals("tmpl-1", template.id)
        assertEquals("Kitchen", template.groupTitle)
        assertEquals("Wipe Surfaces", template.title)
        assertEquals("easy", template.difficulty)
        assertEquals(5, template.basePoints)
        assertEquals("weekly", template.recurrence.type)
        assertNull(template.recurrence.intervalDays)
        assertEquals(listOf("monday", "friday"), template.recurrence.weekdays)
    }

    @Test
    fun `parseFullTemplate defaults difficulty to medium when blank`() {
        val json = JSONObject()
            .put("id", "tmpl-2")
            .put("title", "A chore")
            .put("difficulty", "")
        val template = parseFullTemplate(json)
        assertEquals("medium", template.difficulty)
    }

    @Test
    fun `parseFullTemplate defaults groupTitle to General when blank`() {
        val json = JSONObject().put("id", "tmpl-3").put("title", "Chore").put("groupTitle", "")
        assertEquals("General", parseFullTemplate(json).groupTitle)
    }

    // -------------------------------------------------------------------------
    // parseCompatibility
    // -------------------------------------------------------------------------

    @Test
    fun `parseCompatibility maps takeoverRequestsSupported`() {
        val json = JSONObject().put("takeoverRequestsSupported", false)
        assertFalse(parseCompatibility(json).takeoverRequestsSupported)
    }

    @Test
    fun `parseCompatibility defaults takeoverRequestsSupported to true when absent`() {
        assertTrue(parseCompatibility(JSONObject()).takeoverRequestsSupported)
    }

    // -------------------------------------------------------------------------
    // parseAchievement
    // -------------------------------------------------------------------------

    @Test
    fun `parseAchievement maps all fields`() {
        val json = JSONObject()
            .put("key", "first_chore")
            .put("name", "First Steps")
            .put("descriptionKey", "achievement.first_chore.desc")
            .put("category", "milestones")
            .put("isRepeatable", false)
            .put("goal", 1)
            .put("bonusPoints", 50)
            .put("sortOrder", 10)
            .put("progress", 0)
            .put("earnedAt", "2025-05-15T09:00:00Z")
            .put("timesEarned", 1)

        val achievement = parseAchievement(json)

        assertEquals("first_chore", achievement.key)
        assertEquals("First Steps", achievement.name)
        assertEquals(50, achievement.bonusPoints)
        assertEquals("2025-05-15T09:00:00Z", achievement.earnedAt)
        assertFalse(achievement.isRepeatable)
    }

    @Test
    fun `parseAchievement returns null earnedAt for blank value`() {
        val json = JSONObject()
            .put("key", "streak_7")
            .put("name", "Streak 7")
            .put("descriptionKey", "d")
            .put("category", "streaks")
            .put("isRepeatable", true)
            .put("goal", 7)
            .put("bonusPoints", 0)
            .put("sortOrder", 0)
            .put("progress", 3)
            .put("earnedAt", "")
            .put("timesEarned", 0)

        assertNull(parseAchievement(json).earnedAt)
    }

    // -------------------------------------------------------------------------
    // parseReward
    // -------------------------------------------------------------------------

    @Test
    fun `parseReward maps required fields`() {
        val json = JSONObject()
            .put("id", "rw-1")
            .put("title", "Movie Night")
            .put("category", "experience")
            .put("pointCost", 100)
            .put("isEnabled", true)
            .put("isOperatorManaged", false)
            .put("eligibility", "CHILDREN")

        val reward = parseReward(json)

        assertEquals("rw-1", reward.id)
        assertEquals("Movie Night", reward.title)
        assertEquals(100, reward.pointCost)
        assertEquals("CHILDREN", reward.eligibility)
        assertNull(reward.maxRedemptionsPerChild)
        assertNull(reward.cooldownDays)
    }

    @Test
    fun `parseReward maps optional nullable fields when present`() {
        val json = JSONObject()
            .put("id", "rw-2")
            .put("title", "Candy")
            .put("category", "treat")
            .put("pointCost", 10)
            .put("isEnabled", true)
            .put("isOperatorManaged", false)
            .put("maxRedemptionsPerChild", 3)
            .put("cooldownDays", 7)
            .put("eligibility", "ALL")

        val reward = parseReward(json)

        assertEquals(3, reward.maxRedemptionsPerChild)
        assertEquals(7, reward.cooldownDays)
    }

    @Test
    fun `parseReward defaults eligibility to ALL when blank`() {
        val json = JSONObject()
            .put("id", "rw-3")
            .put("title", "Bike ride")
            .put("category", "experience")
            .put("pointCost", 50)
            .put("isEnabled", true)
            .put("isOperatorManaged", false)
            .put("eligibility", "")

        assertEquals("ALL", parseReward(json).eligibility)
    }

    // -------------------------------------------------------------------------
    // parseUser
    // -------------------------------------------------------------------------

    @Test
    fun `parseUser maps fields and uses parseFeatureAccessCached`() {
        val featureAccess = JSONObject()
            .put("templatesManage", false)
            .put("choresManage", true)
            .put("quickLog", false)
            .put("reassignment", true)
            .put("takeoverDirect", true)
            .put("takeoverRequests", true)
            .put("approvals", true)
            .put("proofUploads", true)
            .put("followUpAutomation", true)
            .put("externalCompletion", true)
            .put("deferredFollowUpControl", true)

        val json = JSONObject()
            .put("id", "u-10")
            .put("displayName", "Dave")
            .put("role", "child")
            .put("points", 250)
            .put("currentStreak", 5)
            .put("featureAccess", featureAccess)

        val user = parseUser(json)

        assertEquals("u-10", user.id)
        assertEquals("Dave", user.displayName)
        assertEquals(250, user.points)
        assertFalse(user.featureAccess.templatesManage)
        assertTrue(user.featureAccess.choresManage)
    }

    @Test
    fun `parseUser falls back to default MobileFeatureAccess when featureAccess absent`() {
        val json = JSONObject()
            .put("id", "u-11")
            .put("displayName", "Eve")
            .put("role", "child")
            .put("points", 0)
            .put("currentStreak", 0)

        val user = parseUser(json)
        assertTrue(user.featureAccess.templatesManage)
    }

    // -------------------------------------------------------------------------
    // parseLeaderboardEntry
    // -------------------------------------------------------------------------

    @Test
    fun `parseLeaderboardEntry maps isExternal with default false`() {
        val json = JSONObject()
            .put("displayName", "Frank")
            .put("role", "child")
            .put("points", 150)
            .put("currentStreak", 3)

        val entry = parseLeaderboardEntry(json)
        assertEquals("Frank", entry.displayName)
        assertEquals(150, entry.points)
        assertFalse(entry.isExternal)
    }

    @Test
    fun `parseLeaderboardEntry maps isExternal true when set`() {
        val json = JSONObject()
            .put("displayName", "External Completer")
            .put("role", "")
            .put("points", 0)
            .put("currentStreak", 0)
            .put("isExternal", true)

        assertTrue(parseLeaderboardEntry(json).isExternal)
    }

    // -------------------------------------------------------------------------
    // parseNotificationDevices
    // -------------------------------------------------------------------------

    @Test
    fun `parseNotificationDevices maps device list`() {
        val device = JSONObject()
            .put("id", "dev-1")
            .put("installationId", "install-abc")
            .put("provider", "fcm")
            .put("pushTokenConfigured", true)
            .put("deviceName", "Pixel 8")
            .put("appVersion", "1.0.0")
            .put("locale", "en-US")
            .put("notificationsEnabled", true)
            .put("lastSeenAt", "2025-05-01T10:00:00Z")

        val arr = JSONArray().put(device)
        val devices = parseNotificationDevices(arr)

        assertEquals(1, devices.size)
        assertEquals("dev-1", devices[0].id)
        assertEquals("Pixel 8", devices[0].deviceName)
        assertTrue(devices[0].pushTokenConfigured)
    }

    @Test
    fun `parseNotificationDevices returns empty list for null input`() {
        assertEquals(emptyList<MobileNotificationDevice>(), parseNotificationDevices(null))
    }

    // -------------------------------------------------------------------------
    // parseFullTemplates
    // -------------------------------------------------------------------------

    @Test
    fun `parseFullTemplates skips entries with blank id or title`() {
        val valid = JSONObject()
            .put("id", "t-1")
            .put("title", "Clean Kitchen")
            .put("groupTitle", "Kitchen")
            .put("description", "")
        val missingId = JSONObject().put("id", "").put("title", "Something")
        val missingTitle = JSONObject().put("id", "t-3").put("title", "")

        val arr = JSONArray().put(valid).put(missingId).put(missingTitle)
        val templates = parseFullTemplates(arr)

        assertEquals(1, templates.size)
        assertEquals("t-1", templates[0].id)
    }

    @Test
    fun `parseFullTemplates returns empty list for null input`() {
        assertEquals(emptyList<MobileChoreTemplate>(), parseFullTemplates(null))
    }
}
