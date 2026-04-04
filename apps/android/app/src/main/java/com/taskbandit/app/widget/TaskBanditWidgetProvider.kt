package com.taskbandit.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.taskbandit.app.MainActivity
import com.taskbandit.app.R
import com.taskbandit.app.mobile.MobileChore
import com.taskbandit.app.mobile.TaskBanditMobileApi
import com.taskbandit.app.mobile.TaskBanditSessionStore
import com.taskbandit.app.mobile.TaskBanditUnauthorizedException
import com.taskbandit.app.mobile.TaskBanditWidgetSnapshot
import com.taskbandit.app.mobile.TaskBanditWidgetStore
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.concurrent.thread

private const val widgetPreferencesName = "taskbandit-session"
private const val refreshAction = "com.taskbandit.app.widget.REFRESH"

class TaskBanditWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val snapshot = createWidgetStore(context).readSnapshot()
        appWidgetIds.forEach { appWidgetId ->
            appWidgetManager.updateAppWidget(
                appWidgetId,
                buildRemoteViews(context, snapshot, isRefreshing = false)
            )
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == refreshAction) {
            refreshFromNetwork(context)
        }
    }

    companion object {
        fun refreshAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, TaskBanditWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(componentName)
            val snapshot = createWidgetStore(context).readSnapshot()

            widgetIds.forEach { widgetId ->
                appWidgetManager.updateAppWidget(
                    widgetId,
                    buildRemoteViews(context, snapshot, isRefreshing = false)
                )
            }
        }

        private fun refreshFromNetwork(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, TaskBanditWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (widgetIds.isEmpty()) {
                return
            }

            val sessionStore = TaskBanditSessionStore(
                context.getSharedPreferences(widgetPreferencesName, Context.MODE_PRIVATE)
            )
            val session = sessionStore.readSession()
            val token = session.token
            if (token.isNullOrBlank()) {
                refreshAllWidgets(context)
                return
            }

            val snapshot = createWidgetStore(context).readSnapshot()
            widgetIds.forEach { widgetId ->
                appWidgetManager.updateAppWidget(
                    widgetId,
                    buildRemoteViews(context, snapshot, isRefreshing = true)
                )
            }

            thread(name = "taskbandit-widget-refresh") {
                val widgetStore = createWidgetStore(context)
                val api = TaskBanditMobileApi()
                try {
                    val dashboard = api.loadDashboard(session.baseUrl, token)
                    widgetStore.saveDashboard(dashboard, queuedSubmissions = snapshot?.queuedSubmissions ?: 0)
                } catch (_: TaskBanditUnauthorizedException) {
                    widgetStore.clear()
                } catch (_: Throwable) {
                }

                refreshAllWidgets(context)
            }
        }

        private fun buildRemoteViews(
            context: Context,
            snapshot: TaskBanditWidgetSnapshot?,
            isRefreshing: Boolean
        ): RemoteViews {
            val remoteViews = RemoteViews(context.packageName, R.layout.taskbandit_widget)
            remoteViews.setTextViewText(R.id.widget_title, context.getString(R.string.widget_title))
            remoteViews.setTextViewText(
                R.id.widget_subtitle,
                if (snapshot == null) {
                    context.getString(R.string.widget_signed_out)
                } else {
                    context.getString(R.string.widget_subtitle_value, snapshot.displayName)
                }
            )
            remoteViews.setTextViewText(
                R.id.widget_summary,
                when {
                    isRefreshing -> context.getString(R.string.widget_refreshing)
                    snapshot == null -> context.getString(R.string.widget_summary_empty)
                    else -> context.getString(
                        R.string.widget_summary_value,
                        snapshot.pendingApprovals,
                        snapshot.activeChores
                    )
                }
            )
            remoteViews.setTextViewText(
                R.id.widget_queue,
                if (snapshot == null || snapshot.queuedSubmissions <= 0) {
                    context.getString(R.string.widget_queue_clear)
                } else {
                    context.getString(R.string.widget_queue_value, snapshot.queuedSubmissions)
                }
            )

            bindChore(remoteViews, context, snapshot?.chores?.getOrNull(0), R.id.widget_chore_one)
            bindChore(remoteViews, context, snapshot?.chores?.getOrNull(1), R.id.widget_chore_two)
            bindChore(remoteViews, context, snapshot?.chores?.getOrNull(2), R.id.widget_chore_three)

            val openPendingIntent = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            remoteViews.setOnClickPendingIntent(R.id.widget_root, openPendingIntent)

            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                1,
                Intent(context, TaskBanditWidgetProvider::class.java).apply { action = refreshAction },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            remoteViews.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent)

            return remoteViews
        }

        private fun bindChore(
            remoteViews: RemoteViews,
            context: Context,
            chore: MobileChore?,
            viewId: Int
        ) {
            val text = when {
                chore == null -> context.getString(R.string.widget_chore_empty)
                chore.isOverdue -> context.getString(R.string.widget_chore_overdue, chore.title)
                chore.requirePhotoProof -> context.getString(
                    R.string.widget_chore_with_photo,
                    chore.title,
                    formatApiTimestamp(chore.dueAt)
                )
                else -> context.getString(
                    R.string.widget_chore_value,
                    chore.title,
                    formatApiTimestamp(chore.dueAt)
                )
            }

            remoteViews.setTextViewText(viewId, text)
        }

        private fun formatApiTimestamp(value: String): String {
            return runCatching {
                DateTimeFormatter.ofPattern("MM-dd HH:mm")
                    .withZone(ZoneId.systemDefault())
                    .format(Instant.parse(value))
            }.getOrDefault(value)
        }

        private fun createWidgetStore(context: Context): TaskBanditWidgetStore {
            return TaskBanditWidgetStore(
                context.getSharedPreferences(widgetPreferencesName, Context.MODE_PRIVATE)
            )
        }
    }
}
