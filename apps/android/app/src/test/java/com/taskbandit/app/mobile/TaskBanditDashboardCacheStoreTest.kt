package com.taskbandit.app.mobile

import android.content.SharedPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TaskBanditDashboardCacheStoreTest {

    @Test
    fun `writes and reads dashboard cache for matching base url`() {
        val preferences = InMemorySharedPreferences()
        val store = TaskBanditDashboardCacheStore(preferences)
        val dashboard = sampleDashboard()

        store.save("https://api.taskbandit.app", dashboard)
        val cached = store.read("https://api.taskbandit.app")

        assertNotNull(cached)
        assertEquals("https://api.taskbandit.app", cached?.baseUrl)
        assertEquals("user-1", cached?.dashboard?.user?.id)
        assertEquals(1, cached?.dashboard?.chores?.size)
        assertTrue((cached?.cachedAtEpochMillis ?: 0L) > 0L)
    }

    @Test
    fun `returns null for malformed payload`() {
        val preferences = InMemorySharedPreferences()
        preferences.edit().putString("dashboard_cache", "{not-valid-json").apply()
        val store = TaskBanditDashboardCacheStore(preferences)

        val cached = store.read("https://api.taskbandit.app")

        assertNull(cached)
    }

    @Test
    fun `returns null when cached base url does not match active base url`() {
        val preferences = InMemorySharedPreferences()
        val store = TaskBanditDashboardCacheStore(preferences)
        store.save("https://api.taskbandit.app", sampleDashboard())

        val cached = store.read("https://api.example.com")

        assertNull(cached)
    }

    @Test
    fun `clears cached dashboard`() {
        val preferences = InMemorySharedPreferences()
        val store = TaskBanditDashboardCacheStore(preferences)
        store.save("https://api.taskbandit.app", sampleDashboard())

        store.clear()

        assertNull(store.read("https://api.taskbandit.app"))
    }

    private fun sampleDashboard(): MobileDashboard {
        return MobileDashboard(
            user = MobileUser(
                id = "user-1",
                displayName = "Ava",
                role = "parent",
                points = 42,
                currentStreak = 3
            ),
            pendingApprovals = 2,
            activeChores = 1,
            streakLeader = "Ava",
            leaderboard = listOf(
                MobileLeaderboardEntry(
                    displayName = "Ava",
                    role = "parent",
                    points = 42,
                    currentStreak = 3
                )
            ),
            chores = listOf(
                MobileChore(
                    id = "chore-1",
                    title = "Dishes",
                    groupTitle = "Kitchen",
                    typeTitle = "Dishes",
                    state = "open",
                    dueAt = "2026-05-13T08:00:00.000Z",
                    isOverdue = false,
                    requirePhotoProof = false,
                    checklist = listOf(
                        MobileChecklistItem(
                            id = "item-1",
                            title = "Rinse plates",
                            required = true
                        )
                    ),
                    completedChecklistIds = emptyList()
                )
            ),
            takeoverRequests = emptyList(),
            notifications = listOf(
                MobileNotification(
                    id = "notification-1",
                    type = "reminder",
                    title = "Reminder",
                    message = "Please complete your chore.",
                    isRead = false,
                    createdAt = "2026-05-13T07:50:00.000Z"
                )
            ),
            members = listOf(
                MobileHouseholdMember(
                    id = "member-1",
                    displayName = "Ava",
                    role = "parent"
                )
            ),
            templates = listOf(
                MobileChoreTemplate(
                    id = "template-1",
                    groupTitle = "Kitchen",
                    title = "Dishes",
                    description = "Wash dishes",
                    assignmentStrategy = "round_robin",
                    recurrence = MobileTemplateRecurrence(
                        type = "weekly",
                        intervalDays = null,
                        weekdays = listOf("MONDAY")
                    ),
                    requirePhotoProof = false
                )
            ),
            compatibility = MobileDashboardCompatibility(
                takeoverRequestsSupported = true
            )
        )
    }
}

private class InMemorySharedPreferences : SharedPreferences {
    private val values = mutableMapOf<String, Any?>()

    override fun getAll(): MutableMap<String, *> = values.toMutableMap()

    override fun getString(key: String?, defValue: String?): String? {
        return values[key] as? String ?: defValue
    }

    override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? {
        @Suppress("UNCHECKED_CAST")
        return (values[key] as? MutableSet<String>)?.toMutableSet() ?: defValues
    }

    override fun getInt(key: String?, defValue: Int): Int {
        return values[key] as? Int ?: defValue
    }

    override fun getLong(key: String?, defValue: Long): Long {
        return values[key] as? Long ?: defValue
    }

    override fun getFloat(key: String?, defValue: Float): Float {
        return values[key] as? Float ?: defValue
    }

    override fun getBoolean(key: String?, defValue: Boolean): Boolean {
        return values[key] as? Boolean ?: defValue
    }

    override fun contains(key: String?): Boolean = values.containsKey(key)

    override fun edit(): SharedPreferences.Editor = Editor(values)

    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {
    }

    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {
    }

    private class Editor(
        private val values: MutableMap<String, Any?>
    ) : SharedPreferences.Editor {
        private val pending = mutableMapOf<String, Any?>()
        private val removals = mutableSetOf<String>()
        private var clearRequested = false

        override fun putString(key: String?, value: String?): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = value
                removals.remove(key)
            }
            return this
        }

        override fun putStringSet(key: String?, values: MutableSet<String>?): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = values?.toMutableSet()
                removals.remove(key)
            }
            return this
        }

        override fun putInt(key: String?, value: Int): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = value
                removals.remove(key)
            }
            return this
        }

        override fun putLong(key: String?, value: Long): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = value
                removals.remove(key)
            }
            return this
        }

        override fun putFloat(key: String?, value: Float): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = value
                removals.remove(key)
            }
            return this
        }

        override fun putBoolean(key: String?, value: Boolean): SharedPreferences.Editor {
            if (key != null) {
                pending[key] = value
                removals.remove(key)
            }
            return this
        }

        override fun remove(key: String?): SharedPreferences.Editor {
            if (key != null) {
                removals.add(key)
                pending.remove(key)
            }
            return this
        }

        override fun clear(): SharedPreferences.Editor {
            clearRequested = true
            pending.clear()
            removals.clear()
            return this
        }

        override fun commit(): Boolean {
            apply()
            return true
        }

        override fun apply() {
            if (clearRequested) {
                values.clear()
            }
            removals.forEach(values::remove)
            values.putAll(pending)
            pending.clear()
            removals.clear()
            clearRequested = false
        }
    }
}
