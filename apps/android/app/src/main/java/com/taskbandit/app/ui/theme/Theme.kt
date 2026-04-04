package com.taskbandit.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme

private val LightColors = lightColorScheme(
    primary = Ink,
    secondary = Sky,
    tertiary = Gold,
    background = Cream,
    surface = Cream,
    primaryContainer = Mint,
    secondaryContainer = Coral
)

private val DarkColors = darkColorScheme(
    primary = Sky,
    secondary = Mint,
    tertiary = Gold
)

@Composable
fun TaskBanditTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = TaskBanditTypography,
        content = content
    )
}
