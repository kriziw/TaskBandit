package com.taskbandit.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.taskbandit.app.MainActivity
import com.taskbandit.app.R
import com.taskbandit.app.mobile.TaskBanditSessionStore
import kotlin.random.Random

class TaskBanditFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val preferences = getSharedPreferences("taskbandit-session", MODE_PRIVATE)
        TaskBanditSessionStore(preferences).savePushToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val notification = message.notification ?: return
        ensureNotificationChannel()

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builtNotification = NotificationCompat.Builder(this, pushChannelId)
            .setSmallIcon(R.drawable.ic_taskbandit_mark)
            .setContentTitle(notification.title ?: getString(R.string.app_name))
            .setContentText(notification.body ?: "")
            .setStyle(NotificationCompat.BigTextStyle().bigText(notification.body ?: ""))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        runCatching {
            NotificationManagerCompat.from(this).notify(Random.nextInt(), builtNotification)
        }
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existingChannel = notificationManager.getNotificationChannel(pushChannelId)
        if (existingChannel != null) {
            return
        }

        notificationManager.createNotificationChannel(
            NotificationChannel(
                pushChannelId,
                getString(R.string.mobile_push_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.mobile_push_channel_description)
            }
        )
    }

    companion object {
        private const val pushChannelId = "taskbandit-household"
    }
}
