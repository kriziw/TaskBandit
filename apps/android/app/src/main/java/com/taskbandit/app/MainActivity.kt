package com.taskbandit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.taskbandit.app.ui.theme.TaskBanditTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TaskBanditTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    TaskBanditHome()
                }
            }
        }
    }
}

private data class DashboardTile(val label: String, val value: String)
private data class ChorePreview(val title: String, val detail: String)

@Composable
private fun TaskBanditHome() {
    val tiles = listOf(
        DashboardTile("Pending approvals", "3"),
        DashboardTile("Today's chores", "5"),
        DashboardTile("Current streak", "4")
    )
    val chores = listOf(
        ChorePreview("Run the washing machine", "Assigned to Luca"),
        ChorePreview("Hang clothes to dry", "Requires photo proof"),
        ChorePreview("Wipe the kitchen table", "Round robin assignment")
    )

    Scaffold { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primaryContainer,
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "TaskBandit",
                        style = MaterialTheme.typography.headlineLarge
                    )
                    Text(
                        text = "Playful household teamwork with approvals, streaks, and photo-proof chores.",
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    tiles.forEach { tile ->
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(tile.label, style = MaterialTheme.typography.labelLarge)
                                Text(tile.value, style = MaterialTheme.typography.headlineSmall)
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Chore preview",
                    style = MaterialTheme.typography.titleLarge
                )
            }

            items(chores) { chore ->
                Card {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(chore.title, style = MaterialTheme.typography.titleMedium)
                        Text(chore.detail, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

