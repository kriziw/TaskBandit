@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.taskbandit.app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.taskbandit.app.mobile.MobileAuthProviders
import com.taskbandit.app.mobile.MobilePublicEnrollmentSiteConfig
import com.taskbandit.app.mobile.MobileReleaseInfo

@Composable
internal fun LoginScreen(
    serverUrl: String,
    authProviders: MobileAuthProviders?,
    hostedEnrollmentConfig: MobilePublicEnrollmentSiteConfig?,
    authProvidersCheckedBaseUrl: String?,
    isAuthProvidersLoading: Boolean,
    authProvidersErrorMessage: String?,
    email: String,
    password: String,
    registrationDisplayName: String,
    registrationEmail: String,
    registrationPassword: String,
    isBusy: Boolean,
    errorMessage: String?,
    onboardingHint: String?,
    onServerUrlChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegistrationDisplayNameChange: (String) -> Unit,
    onRegistrationEmailChange: (String) -> Unit,
    onRegistrationPasswordChange: (String) -> Unit,
    onCheckSignInMethods: () -> Unit,
    onOidcLogin: () -> Unit,
    onLogin: () -> Unit,
    onLocalSignup: () -> Unit,
    onHostedSignup: () -> Unit
) {
    val emailFocusRequester = remember { FocusRequester() }
    val passwordFocusRequester = remember { FocusRequester() }
    var showSelfHostedSetup by rememberSaveable { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val normalizedServerUrl = serverUrl.trim().ifBlank { defaultApiBaseUrl }
    val hasCheckedCurrentServer = authProvidersCheckedBaseUrl == normalizedServerUrl
    val showProviderStatus = hasCheckedCurrentServer || isAuthProvidersLoading || !authProvidersErrorMessage.isNullOrBlank()
    val showLocalLogin = when {
        authProviders?.local?.enabled == true -> true
        !hasCheckedCurrentServer && authProvidersErrorMessage.isNullOrBlank() && !isAuthProvidersLoading -> false
        else -> authProvidersErrorMessage != null || authProviders == null
    }
    val showOidcLogin = authProviders?.oidc?.enabled == true
    val showLocalSignupAction = authProviders?.local?.enabled == true && authProviders.local.selfSignupEnabled
    val showHostedSignupAction = !showSelfHostedSetup && !showLocalSignupAction && (
        hostedEnrollmentConfig?.publicEnrollmentEnabled == true || normalizedServerUrl == defaultApiBaseUrl
    )

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        MaterialTheme.colorScheme.primaryContainer,
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .padding(horizontal = 20.dp, vertical = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        val isTablet = isTabletWidth(maxWidth)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (isTablet) Modifier.widthIn(max = 1040.dp) else Modifier.widthIn(max = 520.dp))
        ) {
            if (isTablet) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(28.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_taskbandit_mark),
                            contentDescription = stringResource(R.string.brand_mark_description),
                            modifier = Modifier.size(104.dp)
                        )
                        Text(
                            text = stringResource(R.string.mobile_login_title),
                            style = MaterialTheme.typography.headlineMedium
                        )
                        Text(
                            text = stringResource(R.string.mobile_login_hint),
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                    Column(
                        modifier = Modifier.weight(1.15f),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        LoginMethodsForm(
                            serverUrl = serverUrl,
                            email = email,
                            password = password,
                            isBusy = isBusy,
                            errorMessage = errorMessage,
                            onboardingHint = onboardingHint,
                            authProviders = authProviders,
                            showProviderStatus = showProviderStatus,
                            showLocalLogin = showLocalLogin,
                            showOidcLogin = showOidcLogin,
                            isAuthProvidersLoading = isAuthProvidersLoading,
                            authProvidersErrorMessage = authProvidersErrorMessage,
                            emailFocusRequester = emailFocusRequester,
                            passwordFocusRequester = passwordFocusRequester,
                            focusManagerClear = { focusManager.clearFocus() },
                            onServerUrlChange = onServerUrlChange,
                            onEmailChange = onEmailChange,
                            onPasswordChange = onPasswordChange,
                            registrationDisplayName = registrationDisplayName,
                            registrationEmail = registrationEmail,
                            registrationPassword = registrationPassword,
                            onRegistrationDisplayNameChange = onRegistrationDisplayNameChange,
                            onRegistrationEmailChange = onRegistrationEmailChange,
                            onRegistrationPasswordChange = onRegistrationPasswordChange,
                            onCheckSignInMethods = onCheckSignInMethods,
                            onOidcLogin = onOidcLogin,
                            onLogin = onLogin,
                            onLocalSignup = onLocalSignup,
                            onHostedSignup = onHostedSignup,
                            showLocalSignupAction = showLocalSignupAction,
                            showHostedSignupAction = showHostedSignupAction,
                            showSelfHostedSetup = showSelfHostedSetup,
                            onToggleSelfHostedSetup = { showSelfHostedSetup = it }
                        )
                    }
                }
            } else {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Image(
                        painter = painterResource(R.drawable.ic_taskbandit_mark),
                        contentDescription = stringResource(R.string.brand_mark_description),
                        modifier = Modifier.size(84.dp)
                    )
                    Text(
                        text = stringResource(R.string.mobile_login_title),
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Text(
                        text = stringResource(R.string.mobile_login_hint),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    LoginMethodsForm(
                        serverUrl = serverUrl,
                        email = email,
                        password = password,
                        isBusy = isBusy,
                        errorMessage = errorMessage,
                        onboardingHint = onboardingHint,
                        authProviders = authProviders,
                        showProviderStatus = showProviderStatus,
                        showLocalLogin = showLocalLogin,
                        showOidcLogin = showOidcLogin,
                        isAuthProvidersLoading = isAuthProvidersLoading,
                        authProvidersErrorMessage = authProvidersErrorMessage,
                        emailFocusRequester = emailFocusRequester,
                        passwordFocusRequester = passwordFocusRequester,
                        focusManagerClear = { focusManager.clearFocus() },
                        onServerUrlChange = onServerUrlChange,
                        onEmailChange = onEmailChange,
                        onPasswordChange = onPasswordChange,
                        registrationDisplayName = registrationDisplayName,
                        registrationEmail = registrationEmail,
                        registrationPassword = registrationPassword,
                        onRegistrationDisplayNameChange = onRegistrationDisplayNameChange,
                        onRegistrationEmailChange = onRegistrationEmailChange,
                        onRegistrationPasswordChange = onRegistrationPasswordChange,
                        onCheckSignInMethods = onCheckSignInMethods,
                        onOidcLogin = onOidcLogin,
                        onLogin = onLogin,
                        onLocalSignup = onLocalSignup,
                        onHostedSignup = onHostedSignup,
                        showLocalSignupAction = showLocalSignupAction,
                        showHostedSignupAction = showHostedSignupAction,
                        showSelfHostedSetup = showSelfHostedSetup,
                        onToggleSelfHostedSetup = { showSelfHostedSetup = it }
                    )
                }
            }
        }
    }
}

@Composable
internal fun LoginMethodsForm(
    serverUrl: String,
    email: String,
    password: String,
    registrationDisplayName: String,
    registrationEmail: String,
    registrationPassword: String,
    isBusy: Boolean,
    errorMessage: String?,
    onboardingHint: String?,
    authProviders: MobileAuthProviders?,
    showProviderStatus: Boolean,
    showLocalLogin: Boolean,
    showOidcLogin: Boolean,
    isAuthProvidersLoading: Boolean,
    authProvidersErrorMessage: String?,
    emailFocusRequester: FocusRequester,
    passwordFocusRequester: FocusRequester,
    focusManagerClear: () -> Unit,
    onServerUrlChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegistrationDisplayNameChange: (String) -> Unit,
    onRegistrationEmailChange: (String) -> Unit,
    onRegistrationPasswordChange: (String) -> Unit,
    onCheckSignInMethods: () -> Unit,
    onOidcLogin: () -> Unit,
    onLogin: () -> Unit,
    onLocalSignup: () -> Unit,
    onHostedSignup: () -> Unit,
    showLocalSignupAction: Boolean,
    showHostedSignupAction: Boolean,
    showSelfHostedSetup: Boolean,
    onToggleSelfHostedSetup: (Boolean) -> Unit
) {
    val localAuthEnabled = authProviders?.local?.enabled == true
    val oidcAuthEnabled = authProviders?.oidc?.enabled == true
    val hostedCredentialFallback = !showSelfHostedSetup && !localAuthEnabled && !oidcAuthEnabled
    val showLocalLoginControls = showLocalLogin || hostedCredentialFallback
    val registrationFieldsValid =
        registrationDisplayName.trim().isNotBlank() &&
            registrationEmail.trim().isNotBlank() &&
            registrationPassword.length >= 8
    val registrationAvailable = showLocalSignupAction || showHostedSignupAction
    var authFormMode by rememberSaveable { mutableStateOf("login") }
    val noSupportedMethodsMessage =
        if (hostedCredentialFallback) {
            stringResource(R.string.mobile_auth_methods_cloud_login_ready)
        } else if (showSelfHostedSetup) {
            stringResource(R.string.mobile_auth_methods_unavailable)
        } else {
            stringResource(R.string.mobile_auth_methods_tenant_not_ready)
        }

    if (showSelfHostedSetup) {
        OutlinedTextField(
            value = serverUrl,
            onValueChange = onServerUrlChange,
            label = { Text(stringResource(R.string.mobile_server_url)) },
            supportingText = { Text(stringResource(R.string.mobile_server_url_hint)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(
                onNext = {
                    onCheckSignInMethods()
                    if (showLocalLogin) {
                        emailFocusRequester.requestFocus()
                    } else {
                        focusManagerClear()
                    }
                }
            ),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedButton(
            onClick = onCheckSignInMethods,
            enabled = !isBusy && !isAuthProvidersLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_auth_methods_check_action))
        }
    } else {
        LaunchedEffect(Unit) {
            if (serverUrl.trim() != defaultApiBaseUrl) {
                onServerUrlChange(defaultApiBaseUrl)
            }
        }
    }
    if (showProviderStatus) {
        Text(
            text = when {
                isAuthProvidersLoading -> stringResource(R.string.mobile_auth_methods_loading)
                !authProvidersErrorMessage.isNullOrBlank() -> authProvidersErrorMessage
                oidcAuthEnabled && localAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_local_and_sso)
                oidcAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_sso_only)
                localAuthEnabled ->
                    stringResource(R.string.mobile_auth_methods_local_only)
                else -> noSupportedMethodsMessage
            },
            color = if (!authProvidersErrorMessage.isNullOrBlank()) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            style = MaterialTheme.typography.bodySmall
        )
    } else {
        Text(
            text = stringResource(R.string.mobile_auth_methods_hint),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
    if (showLocalLoginControls && authFormMode == "login") {
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text(stringResource(R.string.mobile_email)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { passwordFocusRequester.requestFocus() }),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(emailFocusRequester)
        )
        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChange,
            label = { Text(stringResource(R.string.mobile_password)) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManagerClear()
                    onLogin()
                }
            ),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(passwordFocusRequester)
        )
        Button(
            onClick = onLogin,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isBusy) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            } else {
                Text(stringResource(R.string.mobile_login_action))
            }
        }
        if (registrationAvailable) {
            TextButton(
                onClick = { authFormMode = "register" },
                enabled = !isBusy,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_local_action))
            }
        }
    }
    if (registrationAvailable && authFormMode == "register") {
        Text(
            text = stringResource(
                if (showHostedSignupAction) {
                    R.string.mobile_signup_hybrid_hint
                } else {
                    R.string.mobile_signup_local_hint
                }
            ),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedTextField(
            value = registrationDisplayName,
            onValueChange = onRegistrationDisplayNameChange,
            label = { Text(stringResource(R.string.mobile_signup_display_name)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = registrationEmail,
            onValueChange = onRegistrationEmailChange,
            label = { Text(stringResource(R.string.mobile_signup_email)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = registrationPassword,
            onValueChange = onRegistrationPasswordChange,
            label = { Text(stringResource(R.string.mobile_signup_password)) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (showHostedSignupAction) {
            OutlinedButton(
                onClick = onHostedSignup,
                enabled = !isBusy && registrationFieldsValid,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_hosted_action))
            }
        } else if (showLocalSignupAction) {
            Button(
                onClick = onLocalSignup,
                enabled = !isBusy && registrationFieldsValid,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.mobile_signup_local_action))
            }
        }
        TextButton(
            onClick = { authFormMode = "login" },
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_login_action))
        }
    }
    if (showOidcLogin && authFormMode == "login") {
        OutlinedButton(
            onClick = onOidcLogin,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(stringResource(R.string.mobile_login_sso_action))
        }
    }
    TextButton(
        onClick = {
            onToggleSelfHostedSetup(!showSelfHostedSetup)
            if (showSelfHostedSetup) {
                onServerUrlChange(defaultApiBaseUrl)
            }
        },
        enabled = !isBusy,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            stringResource(
                if (showSelfHostedSetup) {
                    R.string.mobile_self_hosted_back_to_saas
                } else {
                    R.string.mobile_self_hosted_setup_action
                }
            )
        )
    }
    if (!errorMessage.isNullOrBlank()) {
        Text(
            text = errorMessage,
            color = MaterialTheme.colorScheme.error
        )
    }
    if (!onboardingHint.isNullOrBlank()) {
        Text(
            text = onboardingHint,
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

