package com.taskbandit.app.mobile

import android.content.SharedPreferences

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

    fun clearToken(baseUrl: String) {
        preferences.edit()
            .putString("base_url", baseUrl.ifBlank { defaultApiBaseUrl })
            .remove("token")
            .apply()
    }
}
