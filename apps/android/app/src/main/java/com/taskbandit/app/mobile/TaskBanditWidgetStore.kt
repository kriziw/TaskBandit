package com.taskbandit.app.mobile

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

data class TaskBanditWidgetSnapshot(
    val displayName: String,
    val pendingApprovals: Int,
    val activeChores: Int,
    val queuedSubmissions: Int,
    val chores: List<MobileChore>
)

class TaskBanditWidgetStore(
    private val preferences: SharedPreferences
) {
    fun saveDashboard(dashboard: MobileDashboard, queuedSubmissions: Int) {
        val payload = JSONObject()
            .put("displayName", dashboard.user.displayName)
            .put("pendingApprovals", dashboard.pendingApprovals)
            .put("activeChores", dashboard.activeChores)
            .put("queuedSubmissions", queuedSubmissions)
            .put(
                "chores",
                JSONArray().apply {
                    dashboard.chores.take(3).forEach { chore ->
                        put(
                            JSONObject()
                                .put("id", chore.id)
                                .put("title", chore.title)
                                .put("state", chore.state)
                                .put("dueAt", chore.dueAt)
                                .put("isOverdue", chore.isOverdue)
                                .put("requirePhotoProof", chore.requirePhotoProof)
                        )
                    }
                }
            )

        preferences.edit()
            .putString("widget_dashboard", payload.toString())
            .apply()
    }

    fun clear() {
        preferences.edit()
            .remove("widget_dashboard")
            .apply()
    }

    fun readSnapshot(): TaskBanditWidgetSnapshot? {
        val rawValue = preferences.getString("widget_dashboard", null) ?: return null
        val parsed = JSONTokener(rawValue).nextValue() as? JSONObject ?: return null

        return TaskBanditWidgetSnapshot(
            displayName = parsed.optString("displayName"),
            pendingApprovals = parsed.optInt("pendingApprovals"),
            activeChores = parsed.optInt("activeChores"),
            queuedSubmissions = parsed.optInt("queuedSubmissions"),
            chores = parseChores(parsed.optJSONArray("chores"))
        )
    }

    private fun parseChores(entries: JSONArray?): List<MobileChore> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val entry = entries.optJSONObject(index) ?: continue
                add(
                    MobileChore(
                        id = entry.optString("id"),
                        title = entry.optString("title"),
                        state = entry.optString("state"),
                        dueAt = entry.optString("dueAt"),
                        isOverdue = entry.optBoolean("isOverdue"),
                        requirePhotoProof = entry.optBoolean("requirePhotoProof"),
                        checklist = emptyList(),
                        completedChecklistIds = emptyList()
                    )
                )
            }
        }
    }
}
