package com.taskbandit.app.mobile

import android.content.SharedPreferences

enum class MobileThemeMode {
    SYSTEM,
    LIGHT,
    DARK
}

class TaskBanditAppPreferencesStore(
    private val preferences: SharedPreferences
) {
    fun readThemeMode(): MobileThemeMode {
        val storedValue = preferences.getString("theme_mode", MobileThemeMode.SYSTEM.name).orEmpty()
        return MobileThemeMode.entries.firstOrNull { it.name == storedValue } ?: MobileThemeMode.SYSTEM
    }

    fun saveThemeMode(value: MobileThemeMode) {
        preferences.edit()
            .putString("theme_mode", value.name)
            .apply()
    }

    fun readLanguageTag(): String =
        preferences.getString("language_tag", "system").orEmpty().ifBlank { "system" }

    fun saveLanguageTag(value: String) {
        preferences.edit()
            .putString("language_tag", value.ifBlank { "system" })
            .apply()
    }
}
