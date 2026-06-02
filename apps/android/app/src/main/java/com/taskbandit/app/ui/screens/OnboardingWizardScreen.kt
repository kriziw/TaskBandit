package com.taskbandit.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.taskbandit.app.mobile.MobileOnboardingAnswers

private val TOTAL_STEPS = 6

@Composable
fun OnboardingWizardScreen(
    step: Int,
    answers: MobileOnboardingAnswers,
    onAnswersChange: (MobileOnboardingAnswers) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    onFinish: (MobileOnboardingAnswers) -> Unit,
    onSkip: () -> Unit
) {
    val isLastStep = step >= TOTAL_STEPS - 1

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Set up your household",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Step ${step + 1} of $TOTAL_STEPS — every question is skippable.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(8.dp))

            when (step) {
                0 -> HouseholdTypeStep(answers, onAnswersChange)
                1 -> HomeTypeStep(answers, onAnswersChange)
                2 -> AppliancesStep(answers, onAnswersChange)
                3 -> PetsStep(answers, onAnswersChange)
                4 -> CookingStep(answers, onAnswersChange)
                5 -> GamificationStep(answers, onAnswersChange)
            }

            Spacer(Modifier.weight(1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (step > 0) {
                    OutlinedButton(onClick = onBack) { Text("Back") }
                }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onSkip) { Text("Skip setup") }
                if (isLastStep) {
                    Button(onClick = { onFinish(filledAnswers(answers)) }) { Text("Finish") }
                } else {
                    Button(onClick = onNext) { Text("Next") }
                }
            }
        }
    }
}

private fun filledAnswers(a: MobileOnboardingAnswers) = a.copy(
    householdType = a.householdType.ifBlank { "family" },
    homeType = a.homeType.ifBlank { "house" },
    cookingStyle = a.cookingStyle.ifBlank { "mixed" },
    gamificationStyle = a.gamificationStyle.ifBlank { "default" }
)

@Composable
private fun HouseholdTypeStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("Who lives here?", style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "solo" to "Just me",
        "couple" to "Two adults / couple",
        "family" to "Family with children",
        "flatmates" to "Shared house / flatmates"
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, label) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(selected = answers.householdType == value, onClick = { onChange(answers.copy(householdType = value)) }, role = Role.RadioButton)
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.householdType == value, onClick = null)
                Text(label, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun HomeTypeStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("What kind of home?", style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "flat" to "Flat / apartment",
        "house" to "House (no garden)",
        "house_garden" to "House with garden",
        "house_garden_lawn" to "House with garden and lawn"
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, label) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(selected = answers.homeType == value, onClick = { onChange(answers.copy(homeType = value)) }, role = Role.RadioButton)
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.homeType == value, onClick = null)
                Text(label, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun AppliancesStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("Which appliances do you have?", style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "dishwasher" to "Dishwasher",
        "tumble_dryer" to "Tumble dryer",
        "washing_machine" to "Washing machine",
        "robot_vacuum" to "Robot vacuum / Roomba"
    )
    options.forEach { (value, label) ->
        val checked = value in answers.appliances
        Row(
            Modifier
                .fillMaxWidth()
                .selectable(selected = checked, onClick = {
                    val next = if (checked) answers.appliances - value else answers.appliances + value
                    onChange(answers.copy(appliances = next))
                }, role = Role.Checkbox)
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(checked = checked, onCheckedChange = null)
            Text(label, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun PetsStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("Do you have pets?", style = MaterialTheme.typography.titleMedium)
    val options = listOf("none" to "No pets", "dog" to "Dog(s)", "cat" to "Cat(s)", "other" to "Other")
    options.forEach { (value, label) ->
        val checked = value in answers.pets
        Row(
            Modifier
                .fillMaxWidth()
                .selectable(selected = checked, onClick = {
                    val next = if (checked) answers.pets - value else answers.pets + value
                    onChange(answers.copy(pets = next))
                }, role = Role.Checkbox)
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(checked = checked, onCheckedChange = null)
            Text(label, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun CookingStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("How does cooking work?", style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "one_person" to "One person mostly cooks",
        "take_turns" to "We take turns",
        "mostly_takeout" to "Mostly eat out / order in",
        "mixed" to "Mixed"
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, label) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(selected = answers.cookingStyle == value, onClick = { onChange(answers.copy(cookingStyle = value)) }, role = Role.RadioButton)
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.cookingStyle == value, onClick = null)
                Text(label, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun GamificationStep(answers: MobileOnboardingAnswers, onChange: (MobileOnboardingAnswers) -> Unit) {
    Text("How do you want to motivate your household?", style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "track_only" to "Just track who's done what (no points pressure)",
        "light" to "Light gamification (streaks + leaderboard)",
        "full" to "Full rewards (points → prizes, achievements, mastery)",
        "default" to "Use defaults"
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, label) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(selected = answers.gamificationStyle == value, onClick = { onChange(answers.copy(gamificationStyle = value)) }, role = Role.RadioButton)
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.gamificationStyle == value, onClick = null)
                Text(label, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}
