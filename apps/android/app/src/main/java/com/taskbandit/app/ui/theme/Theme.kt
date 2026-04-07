package com.taskbandit.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme

private val LightColors = lightColorScheme(
    primary = Ink,
    onPrimary = Cream,
    secondary = Sky,
    tertiary = Gold,
    background = Cream,
    onBackground = Ink,
    surface = Cream,
    onSurface = Ink,
    // Pastel containers give a soft, warm feel while staying on-brand
    primaryContainer = MintPastel,
    onPrimaryContainer = Ink,
    secondaryContainer = CoralPastel,
    onSecondaryContainer = Ink,
    surfaceVariant = CreamDeep,
    onSurfaceVariant = Ink
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
