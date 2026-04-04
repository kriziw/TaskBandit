package com.taskbandit.app.push

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.taskbandit.app.BuildConfig
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object TaskBanditFirebasePushManager {
    fun isConfigured(): Boolean {
        return BuildConfig.TASKBANDIT_FIREBASE_APP_ID.isNotBlank() &&
            BuildConfig.TASKBANDIT_FIREBASE_API_KEY.isNotBlank() &&
            BuildConfig.TASKBANDIT_FIREBASE_PROJECT_ID.isNotBlank() &&
            BuildConfig.TASKBANDIT_FIREBASE_SENDER_ID.isNotBlank()
    }

    fun ensureInitialized(context: Context): Boolean {
        if (!isConfigured()) {
            return false
        }

        if (FirebaseApp.getApps(context).isNotEmpty()) {
            return true
        }

        val options = FirebaseOptions.Builder()
            .setApplicationId(BuildConfig.TASKBANDIT_FIREBASE_APP_ID)
            .setApiKey(BuildConfig.TASKBANDIT_FIREBASE_API_KEY)
            .setProjectId(BuildConfig.TASKBANDIT_FIREBASE_PROJECT_ID)
            .setGcmSenderId(BuildConfig.TASKBANDIT_FIREBASE_SENDER_ID)
            .build()

        FirebaseApp.initializeApp(context, options)
        return true
    }

    suspend fun getTokenOrNull(context: Context): String? {
        if (!ensureInitialized(context)) {
            return null
        }

        return suspendCancellableCoroutine { continuation ->
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token -> continuation.resume(token) }
                .addOnFailureListener { continuation.resume(null) }
        }
    }
}
