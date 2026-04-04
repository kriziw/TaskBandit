package com.taskbandit.app.mobile

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

private const val submissionOutboxKey = "submission_outbox"

class TaskBanditOutboxStore(
    private val preferences: SharedPreferences
) {
    fun readQueue(): List<MobileChoreSubmissionDraft> {
        val rawValue = preferences.getString(submissionOutboxKey, "[]").orEmpty()
        val entries = runCatching { JSONArray(rawValue) }.getOrDefault(JSONArray())

        return buildList {
            for (index in 0 until entries.length()) {
                val entry = entries.optJSONObject(index) ?: continue
                add(
                    MobileChoreSubmissionDraft(
                        id = entry.optString("id"),
                        choreId = entry.optString("choreId"),
                        completedChecklistIds = readStringList(entry.optJSONArray("completedChecklistIds")),
                        proofUriStrings = readStringList(entry.optJSONArray("proofUriStrings")),
                        note = entry.optString("note").ifBlank { null },
                        queuedAtEpochMillis = entry.optLong("queuedAtEpochMillis")
                    )
                )
            }
        }
    }

    fun enqueue(draft: MobileChoreSubmissionDraft) {
        val nextQueue = readQueue()
            .filterNot { it.choreId == draft.choreId }
            .plus(draft)
        writeQueue(nextQueue)
    }

    fun remove(draftId: String) {
        writeQueue(readQueue().filterNot { it.id == draftId })
    }

    private fun writeQueue(entries: List<MobileChoreSubmissionDraft>) {
        val serialized = JSONArray()
        entries.forEach { entry ->
            serialized.put(
                JSONObject()
                    .put("id", entry.id)
                    .put("choreId", entry.choreId)
                    .put("completedChecklistIds", JSONArray(entry.completedChecklistIds))
                    .put("proofUriStrings", JSONArray(entry.proofUriStrings))
                    .put("note", entry.note ?: "")
                    .put("queuedAtEpochMillis", entry.queuedAtEpochMillis)
            )
        }

        preferences.edit()
            .putString(submissionOutboxKey, serialized.toString())
            .apply()
    }

    private fun readStringList(entries: JSONArray?): List<String> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val value = entries.optString(index)
                if (value.isNotBlank()) {
                    add(value)
                }
            }
        }
    }
}
