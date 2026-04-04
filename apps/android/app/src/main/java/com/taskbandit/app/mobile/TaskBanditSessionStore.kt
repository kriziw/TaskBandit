package com.taskbandit.app.mobile

import android.content.SharedPreferences
import java.util.UUID

private const val defaultApiBaseUrl = "http://10.0.2.2:8080"

class TaskBanditSessionStore(
    private val preferences: SharedPreferences
) {
    fun readSession(): TaskBanditSession {
        val baseUrl = preferences.getString("base_url", defaultApiBaseUrl).orEmpty()
        val token = preferences.getString("token", null)
        return TaskBanditSession(
            baseUrl = baseUrl.ifBlank { defaultApiBaseUrl },
            token = token
        )
    }

    fun saveSession(baseUrl: String, token: String) {
        preferences.edit()
            .putString("base_url", baseUrl)
            .putString("token", token)
            .apply()
    }

    fun saveBaseUrl(baseUrl: String) {
        preferences.edit()
            .putString("base_url", baseUrl.ifBlank { defaultApiBaseUrl })
            .apply()
    }

    fun getOrCreateInstallationId(): String {
        val existingValue = preferences.getString("installation_id", null)
        if (!existingValue.isNullOrBlank()) {
            return existingValue
        }

        val createdValue = UUID.randomUUID().toString()
        preferences.edit()
            .putString("installation_id", createdValue)
            .apply()
        return createdValue
    }

    fun savePushToken(token: String) {
        preferences.edit()
            .putString("push_token", token)
            .apply()
    }

    fun readPushToken(): String? = preferences.getString("push_token", null)

    fun readDismissedUpdateKey(): String? = preferences.getString("dismissed_update_key", null)

    fun saveDismissedUpdateKey(value: String) {
        preferences.edit()
            .putString("dismissed_update_key", value)
            .apply()
    }

    fun clearToken(baseUrl: String) {
        preferences.edit()
            .putString("base_url", baseUrl.ifBlank { defaultApiBaseUrl })
            .remove("token")
            .apply()
    }
}
