package com.taskbandit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
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

private data class ChorePreview(
    @StringRes val titleRes: Int,
    @StringRes val detailRes: Int,
    @StringRes val statusRes: Int
)

@Composable
private fun TaskBanditHome() {
    val tiles = listOf(
        DashboardTile(R.string.dashboard_pending_approvals, "3"),
        DashboardTile(R.string.dashboard_todays_chores, "5"),
        DashboardTile(R.string.dashboard_current_streak, "4")
    )
    val chores = listOf(
        ChorePreview(
            R.string.chore_washing_machine,
            R.string.chore_washing_machine_detail,
            R.string.status_pending_parent
        ),
        ChorePreview(
            R.string.chore_hang_clothes,
            R.string.chore_hang_clothes_detail,
            R.string.status_photo_required
        ),
        ChorePreview(
            R.string.chore_wipe_table,
            R.string.chore_wipe_table_detail,
            R.string.status_round_robin
        )
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
                Card {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_taskbandit_mark),
                            contentDescription = stringResource(R.string.brand_mark_description),
                            modifier = Modifier.size(84.dp)
                        )
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            BrandPill(stringResource(R.string.brand_tagline))
                            Text(
                                text = stringResource(R.string.app_name),
                                style = MaterialTheme.typography.headlineLarge
                            )
                            Text(
                                text = stringResource(R.string.app_subtitle),
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = stringResource(R.string.app_home_hint),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }

            item {
                Text(
                    text = stringResource(R.string.dashboard_section_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
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
                                    text = stringResource(tile.labelRes),
                                    style = MaterialTheme.typography.labelLarge
                                )
                                Text(
                                    text = tile.value,
                                    style = MaterialTheme.typography.headlineSmall
                                )
                            }
                        }
                    }
                }
            }

            item {
                Card {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.approvals_watch_title),
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = stringResource(R.string.approvals_watch_detail),
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            BrandPill(
                                text = stringResource(R.string.approvals_chip_ready),
                                background = MaterialTheme.colorScheme.tertiaryContainer
                            )
                            BrandPill(
                                text = stringResource(R.string.approvals_chip_fix),
                                background = MaterialTheme.colorScheme.secondaryContainer
                            )
                        }
                    }
                }
            }

            item {
                Text(
                    text = stringResource(R.string.chore_preview_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }

            items(chores) { chore ->
                Card {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = stringResource(chore.titleRes),
                                style = MaterialTheme.typography.titleMedium
                            )
                            BrandPill(text = stringResource(chore.statusRes))
                        }
                        Text(
                            text = stringResource(chore.detailRes),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            item {
                Card {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = stringResource(R.string.leaderboard_pulse_title),
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = stringResource(R.string.leaderboard_pulse_detail),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            LeaderboardMeter(
                                label = stringResource(R.string.leaderboard_name_alex),
                                width = 88.dp
                            )
                            LeaderboardMeter(
                                label = stringResource(R.string.leaderboard_name_maya),
                                width = 72.dp
                            )
                            LeaderboardMeter(
                                label = stringResource(R.string.leaderboard_name_luca),
                                width = 54.dp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BrandPill(text: String, background: Color = MaterialTheme.colorScheme.primaryContainer) {
    Box(
        modifier = Modifier
            .background(background, RoundedCornerShape(999.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}

@Composable
private fun LeaderboardMeter(label: String, width: Dp) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.width(52.dp)
        )
        Box(
            modifier = Modifier
                .height(14.dp)
                .width(width)
                .background(MaterialTheme.colorScheme.secondary, RoundedCornerShape(999.dp))
        )
    }
}
