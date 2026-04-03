package com.taskbandit.app

import android.os.Bundle
import androidx.annotation.StringRes
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
import androidx.compose.ui.res.stringResource
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

private data class DashboardTile(@StringRes val labelRes: Int, val value: String)
private data class ChorePreview(@StringRes val titleRes: Int, @StringRes val detailRes: Int)

@Composable
private fun TaskBanditHome() {
    val tiles = listOf(
        DashboardTile(R.string.dashboard_pending_approvals, "3"),
        DashboardTile(R.string.dashboard_todays_chores, "5"),
        DashboardTile(R.string.dashboard_current_streak, "4")
    )
    val chores = listOf(
        ChorePreview(R.string.chore_washing_machine, R.string.chore_washing_machine_detail),
        ChorePreview(R.string.chore_hang_clothes, R.string.chore_hang_clothes_detail),
        ChorePreview(R.string.chore_wipe_table, R.string.chore_wipe_table_detail)
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
                        text = stringResource(R.string.app_name),
                        style = MaterialTheme.typography.headlineLarge
                    )
                    Text(
                        text = stringResource(R.string.app_subtitle),
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
                                Text(
                                    stringResource(tile.labelRes),
                                    style = MaterialTheme.typography.labelLarge
                                )
                                Text(tile.value, style = MaterialTheme.typography.headlineSmall)
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    text = stringResource(R.string.chore_preview_title),
                    style = MaterialTheme.typography.titleLarge
                )
            }

            items(chores) { chore ->
                Card {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            stringResource(chore.titleRes),
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            stringResource(chore.detailRes),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}
