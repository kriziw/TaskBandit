package com.taskbandit.app.mobile

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources

sealed interface MobileDashboardSyncSignal {
    data object RefreshRequested : MobileDashboardSyncSignal
    data object Unauthorized : MobileDashboardSyncSignal
}

class TaskBanditDashboardSyncClient {
    private val eventSourceFactory = EventSources.createFactory(
        OkHttpClient.Builder()
            .retryOnConnectionFailure(true)
            .build()
    )

    fun connect(baseUrl: String, token: String): Flow<MobileDashboardSyncSignal> = callbackFlow {
        var keepRunning = true
        var activeEventSource: EventSource? = null

        val worker = launch {
            while (keepRunning) {
                val connectionEnded = CompletableDeferred<Unit>()
                var openedThisAttempt = false

                val request = Request.Builder()
                    .url("${baseUrl.trim().trimEnd('/')}/api/dashboard/sync/stream")
                    .header("Accept", "text/event-stream")
                    .header("Authorization", "Bearer $token")
                    .build()

                activeEventSource = eventSourceFactory.newEventSource(request, object : EventSourceListener() {
                    override fun onOpen(eventSource: EventSource, response: Response) {
                        trySend(MobileDashboardSyncSignal.RefreshRequested)
                        openedThisAttempt = true
                    }

                    override fun onEvent(
                        eventSource: EventSource,
                        id: String?,
                        type: String?,
                        data: String
                    ) {
                        if (type == "heartbeat") {
                            return
                        }

                        trySend(MobileDashboardSyncSignal.RefreshRequested)
                    }

                    override fun onClosed(eventSource: EventSource) {
                        if (!connectionEnded.isCompleted) {
                            connectionEnded.complete(Unit)
                        }
                    }

                    override fun onFailure(
                        eventSource: EventSource,
                        t: Throwable?,
                        response: Response?
                    ) {
                        if (response?.code == 401) {
                            trySend(MobileDashboardSyncSignal.Unauthorized)
                            keepRunning = false
                        }

                        if (!connectionEnded.isCompleted) {
                            connectionEnded.complete(Unit)
                        }
                    }
                })

                connectionEnded.await()
                activeEventSource?.cancel()
                activeEventSource = null

                if (!keepRunning) {
                    break
                }

                delay(if (openedThisAttempt) 1500 else 3000)
            }
        }

        awaitClose {
            keepRunning = false
            activeEventSource?.cancel()
            worker.cancel()
        }
    }
}
