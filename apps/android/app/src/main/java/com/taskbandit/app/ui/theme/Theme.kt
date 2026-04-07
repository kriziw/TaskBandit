package com.taskbandit.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme

private val LightColors = lightColorScheme(
    primary = Ink,
    onPrimary = Cream,
    primaryContainer = MintPastel,
    onPrimaryContainer = Ink,
    secondary = Sky,
    onSecondary = Ink,
    secondaryContainer = CoralPastel,
    onSecondaryContainer = Ink,
    tertiary = Gold,
    onTertiary = Ink,
    background = Cream,
    onBackground = Ink,
    surface = Cream,
    onSurface = Ink,
    surfaceVariant = CreamDeep,
    onSurfaceVariant = Ink,
    // Neutralise the primary-derived tint so cards stay cream, not purple
    surfaceTint = Cream,
    surfaceContainerLowest = Cream,
    surfaceContainerLow = Cream,
    surfaceContainer = CreamDeep,
    surfaceContainerHigh = CreamDeep,
    surfaceContainerHighest = CreamDeeper,
    outlineVariant = CreamDeeper,
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
