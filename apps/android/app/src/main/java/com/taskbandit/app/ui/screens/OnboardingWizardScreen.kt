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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.taskbandit.app.R
import com.taskbandit.app.mobile.MobileOnboardingAnswers

private const val TOTAL_STEPS = 6

@Composable
fun OnboardingWizardScreen(
    step: Int,
    answers: MobileOnboardingAnswers,
    onAnswersChange: (MobileOnboardingAnswers) -> Unit,
    onNext: () -> Unit,      // caller saves draft then increments step
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
                text = stringResource(R.string.wizard_title),
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = stringResource(R.string.wizard_subtitle),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = stringResource(R.string.wizard_step, step + 1, TOTAL_STEPS),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
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
                    OutlinedButton(onClick = onBack) {
                        Text(stringResource(R.string.wizard_back))
                    }
                }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onSkip) {
                    Text(stringResource(R.string.wizard_skip))
                }
                if (isLastStep) {
                    Button(onClick = { onFinish(filledAnswers(answers)) }) {
                        Text(stringResource(R.string.wizard_finish))
                    }
                } else {
                    Button(onClick = onNext) {
                        Text(stringResource(R.string.wizard_next))
                    }
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
private fun HouseholdTypeStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_household_type_question), style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "solo" to R.string.wizard_household_type_solo,
        "couple" to R.string.wizard_household_type_couple,
        "family" to R.string.wizard_household_type_family,
        "flatmates" to R.string.wizard_household_type_flatmates
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, labelRes) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = answers.householdType == value,
                        onClick = { onChange(answers.copy(householdType = value)) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.householdType == value, onClick = null)
                Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun HomeTypeStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_home_type_question), style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "flat" to R.string.wizard_home_type_flat,
        "house" to R.string.wizard_home_type_house,
        "house_garden" to R.string.wizard_home_type_house_garden,
        "house_garden_lawn" to R.string.wizard_home_type_house_garden_lawn
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, labelRes) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = answers.homeType == value,
                        onClick = { onChange(answers.copy(homeType = value)) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.homeType == value, onClick = null)
                Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun AppliancesStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_appliances_question), style = MaterialTheme.typography.titleMedium)
    Text(
        stringResource(R.string.wizard_appliances_hint),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    val options = listOf(
        "dishwasher" to R.string.wizard_appliances_dishwasher,
        "tumble_dryer" to R.string.wizard_appliances_tumble_dryer,
        "washing_machine" to R.string.wizard_appliances_washing_machine,
        "robot_vacuum" to R.string.wizard_appliances_robot_vacuum
    )
    options.forEach { (value, labelRes) ->
        val checked = value in answers.appliances
        Row(
            Modifier
                .fillMaxWidth()
                .selectable(
                    selected = checked,
                    onClick = {
                        val next = if (checked) answers.appliances - value else answers.appliances + value
                        onChange(answers.copy(appliances = next))
                    },
                    role = Role.Checkbox
                )
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(checked = checked, onCheckedChange = null)
            Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun PetsStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_pets_question), style = MaterialTheme.typography.titleMedium)
    Text(
        stringResource(R.string.wizard_pets_hint),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    val options = listOf(
        "none" to R.string.wizard_pets_none,
        "dog" to R.string.wizard_pets_dog,
        "cat" to R.string.wizard_pets_cat,
        "other" to R.string.wizard_pets_other
    )
    options.forEach { (value, labelRes) ->
        val checked = value in answers.pets
        Row(
            Modifier
                .fillMaxWidth()
                .selectable(
                    selected = checked,
                    onClick = {
                        val next = if (checked) answers.pets - value else answers.pets + value
                        onChange(answers.copy(pets = next))
                    },
                    role = Role.Checkbox
                )
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(checked = checked, onCheckedChange = null)
            Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun CookingStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_cooking_question), style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "one_person" to R.string.wizard_cooking_one_person,
        "take_turns" to R.string.wizard_cooking_take_turns,
        "mostly_takeout" to R.string.wizard_cooking_mostly_takeout,
        "mixed" to R.string.wizard_cooking_mixed
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, labelRes) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = answers.cookingStyle == value,
                        onClick = { onChange(answers.copy(cookingStyle = value)) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.cookingStyle == value, onClick = null)
                Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun GamificationStep(
    answers: MobileOnboardingAnswers,
    onChange: (MobileOnboardingAnswers) -> Unit
) {
    Text(stringResource(R.string.wizard_gamification_question), style = MaterialTheme.typography.titleMedium)
    val options = listOf(
        "track_only" to R.string.wizard_gamification_track_only,
        "light" to R.string.wizard_gamification_light,
        "full" to R.string.wizard_gamification_full,
        "default" to R.string.wizard_gamification_default
    )
    Column(Modifier.selectableGroup()) {
        options.forEach { (value, labelRes) ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = answers.gamificationStyle == value,
                        onClick = { onChange(answers.copy(gamificationStyle = value)) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = answers.gamificationStyle == value, onClick = null)
                Text(stringResource(labelRes), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}
