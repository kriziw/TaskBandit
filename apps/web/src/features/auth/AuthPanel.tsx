import { type FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { taskBanditApi } from '../../api/taskbanditApi';
import { useAuthStore, type WorkspaceVariant } from '../../stores/authStore';
import type { SignupInput } from '../../types/taskbandit';
import { BetaSignupForm } from '../beta-signup/BetaSignupForm';

type AuthPanelMode = 'sign_in' | 'password_reset_request' | 'sign_up' | 'request_access';

interface Props {
  workspaceVariant: WorkspaceVariant;
  onNotice: (message: string) => void;
}

export function AuthPanel({ workspaceVariant, onNotice }: Props) {
  const { language, t } = useI18n();
  const {
    providers,
    bootstrapStatus,
    isAuthEntryLoading,
    authEntryError,
    loginError,
    isAuthenticating,
    loadAuthEntry,
    login,
    signup,
    requestPasswordReset,
    completePasswordReset,
    handleOidcCallback,
    setLoginError,
  } = useAuthStore();

  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>('sign_in');
  const [loginForm, setLoginForm] = useState({ email: readLoginEmailFromRoute(), password: '' });
  const [signupForm, setSignupForm] = useState<SignupInput>({
    displayName: '',
    email: '',
    password: '',
  });
  const [passwordResetRequestForm, setPasswordResetRequestForm] = useState({ email: '' });
  const [passwordResetCompleteForm, setPasswordResetCompleteForm] = useState({ password: '' });
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);

  // Handle OIDC and password-reset URL callbacks on mount
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const oidcToken = currentUrl.searchParams.get('oidcToken');
    const oidcError = currentUrl.searchParams.get('oidcError');
    const resetToken = currentUrl.searchParams.get('resetToken');

    if (!oidcToken && !oidcError && !resetToken) {
      return;
    }

    if (resetToken) {
      setPasswordResetToken(resetToken);
      setAuthPanelMode('sign_in');
      setLoginError(null);
      onNotice(t('auth.password_reset_token_ready'));
    }

    if (oidcToken) {
      handleOidcCallback(oidcToken, workspaceVariant);
      onNotice(t('auth.oidc_success'));
    } else if (oidcError) {
      setLoginError(oidcError);
    }

    currentUrl.searchParams.delete('oidcToken');
    currentUrl.searchParams.delete('oidcError');
    currentUrl.searchParams.delete('resetToken');
    window.history.replaceState({}, document.title, currentUrl.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load providers / bootstrap status when unauthenticated
  useEffect(() => {
    void loadAuthEntry(language);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login(loginForm.email, loginForm.password, language, workspaceVariant);
      onNotice(t('auth.login_success'));
    } catch {
      // loginError is already set in the store
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await signup(signupForm, language, workspaceVariant);
      setSignupForm({ displayName: '', email: '', password: '' });
      onNotice(t('auth.signup_success'));
    } catch {
      // loginError is already set in the store
    }
  }

  async function handlePasswordResetRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const message = await requestPasswordReset(passwordResetRequestForm.email, language);
      setPasswordResetRequestForm({ email: '' });
      onNotice(message);
    } catch {
      // loginError is already set in the store
    }
  }

  async function handlePasswordResetCompleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordResetToken) {
      return;
    }
    try {
      const message = await completePasswordReset(
        passwordResetToken,
        passwordResetCompleteForm.password,
        language,
      );
      setPasswordResetCompleteForm({ password: '' });
      setPasswordResetToken(null);
      onNotice(message);
    } catch {
      // loginError is already set in the store
    }
  }

  function handleOidcSignIn() {
    setLoginError(null);
    onNotice(t('auth.oidc_redirecting'));
    window.location.assign(taskBanditApi.getOidcStartUrl(language, window.location.href));
  }

  const noAuthProvidersAvailable = !providers?.local.enabled && !providers?.oidc.enabled;
  const allowCredentialLogin = providers?.local.enabled || noAuthProvidersAvailable;
  const authUnavailableNoticeKey =
    noAuthProvidersAvailable && providers?.local.householdId ? 'auth.local_disabled_notice' : null;

  if (isAuthEntryLoading) {
    return (
      <article className="panel login-panel">
        <div className="section-heading">
          <h2>{t('auth.sign_in')}</h2>
          <span className="section-kicker">{t('auth.setup_loading')}</span>
        </div>
        <p className="inline-message">{t('auth.setup_loading')}</p>
      </article>
    );
  }

  if (authEntryError) {
    return (
      <article className="panel login-panel">
        <div className="section-heading">
          <h2>{t('auth.sign_in')}</h2>
          <span className="section-kicker">{t('auth.setup_retry')}</span>
        </div>
        <p className="inline-message error-text">{authEntryError}</p>
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void loadAuthEntry(language)}
          >
            {t('common.retry')}
          </button>
        </div>
      </article>
    );
  }

  const betaSignupEnabled = bootstrapStatus?.betaSignupEnabled ?? false;
  const [betaSignupSuccess, setBetaSignupSuccess] = useState(false);

  // Bootstrap form is handled by App.tsx; this component only renders the login panel
  if (bootstrapStatus?.isBootstrapped === false) {
    return null;
  }

  if (authPanelMode === 'request_access') {
    return (
      <article className="panel login-panel">
        <div className="section-heading">
          <h2>{betaSignupSuccess ? 'Request submitted' : 'Request access'}</h2>
          {!betaSignupSuccess && (
            <span className="section-kicker">Beta programme</span>
          )}
        </div>
        {betaSignupSuccess ? (
          <>
            <p className="inline-message">
              Thanks for signing up! We'll review your request and email you once a decision has
              been made.
            </p>
            <div className="button-row">
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setBetaSignupSuccess(false);
                  setAuthPanelMode('sign_in');
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        ) : (
          <BetaSignupForm
            onSuccess={() => setBetaSignupSuccess(true)}
            onCancel={() => setAuthPanelMode('sign_in')}
          />
        )}
      </article>
    );
  }

  return (
    <article className="panel login-panel">
      <div className="section-heading">
        <h2>
          {passwordResetToken
            ? t('auth.password_reset_complete_title')
            : authPanelMode === 'password_reset_request'
              ? t('auth.password_reset_request_title')
              : authPanelMode === 'sign_up'
                ? t('auth.sign_up')
                : t('auth.sign_in')}
        </h2>
        {passwordResetToken ? (
          <span className="section-kicker">{t('auth.password_reset_complete_kicker')}</span>
        ) : authPanelMode === 'password_reset_request' ? (
          <span className="section-kicker">{t('auth.password_reset_request_kicker')}</span>
        ) : authPanelMode === 'sign_up' ? (
          <span className="section-kicker">{t('auth.sign_up_kicker')}</span>
        ) : null}
      </div>

      {passwordResetToken ? (
        <form className="login-form" onSubmit={handlePasswordResetCompleteSubmit}>
          <label>
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={passwordResetCompleteForm.password}
              onChange={(event) => setPasswordResetCompleteForm({ password: event.target.value })}
              autoComplete="new-password"
            />
          </label>
          {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={isAuthenticating}>
              {isAuthenticating
                ? t('auth.password_reset_completing')
                : t('auth.password_reset_complete_action')}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={isAuthenticating}
              onClick={() => {
                setPasswordResetToken(null);
                setPasswordResetCompleteForm({ password: '' });
                setAuthPanelMode('sign_in');
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : authPanelMode === 'password_reset_request' ? (
        <form className="login-form" onSubmit={handlePasswordResetRequestSubmit}>
          <label>
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={passwordResetRequestForm.email}
              onChange={(event) => setPasswordResetRequestForm({ email: event.target.value })}
              autoComplete="email"
            />
          </label>
          <p className="inline-message">{t('auth.password_reset_request_hint')}</p>
          {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
          <div className="button-row">
            <button className="secondary-button" type="submit" disabled={isAuthenticating}>
              {isAuthenticating
                ? t('auth.password_reset_requesting')
                : t('auth.password_reset_request_action')}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={isAuthenticating}
              onClick={() => {
                setAuthPanelMode('sign_in');
                setLoginError(null);
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : authPanelMode === 'sign_up' ? (
        <form className="login-form" onSubmit={handleSignupSubmit}>
          <label>
            <span>{t('auth.display_name')}</span>
            <input
              type="text"
              value={signupForm.displayName}
              onChange={(event) =>
                setSignupForm((current) => ({ ...current, displayName: event.target.value }))
              }
              autoComplete="name"
            />
          </label>
          <label>
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm((current) => ({ ...current, email: event.target.value }))
              }
              autoComplete="email"
            />
          </label>
          <label>
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete="new-password"
            />
          </label>
          {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? t('auth.signing_up') : t('auth.sign_up')}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={isAuthenticating}
              onClick={() => {
                setAuthPanelMode('sign_in');
                setLoginError(null);
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <form className="login-form" onSubmit={handleLoginSubmit}>
          {allowCredentialLogin ? (
            <>
              <label>
                <span>{t('auth.email')}</span>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  autoComplete="email"
                />
              </label>
              <label>
                <span>{t('auth.password')}</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  autoComplete="current-password"
                />
              </label>
            </>
          ) : null}
          {authUnavailableNoticeKey ? (
            <p className="inline-message">{t(authUnavailableNoticeKey)}</p>
          ) : null}
          {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
          <div className="button-row">
            {allowCredentialLogin ? (
              <button className="primary-button" type="submit" disabled={isAuthenticating}>
                {isAuthenticating ? t('auth.signing_in') : t('auth.sign_in')}
              </button>
            ) : null}
            {providers?.oidc.enabled ? (
              <button
                className={providers?.local.enabled ? 'secondary-button' : 'primary-button'}
                type="button"
                disabled={isAuthenticating}
                onClick={handleOidcSignIn}
              >
                {t('auth.oidc_sign_in')}
              </button>
            ) : null}
          </div>
          <div className="button-row">
            {allowCredentialLogin ? (
              <button
                className="ghost-button"
                type="button"
                disabled={isAuthenticating}
                onClick={() => {
                  setPasswordResetRequestForm({
                    email: passwordResetRequestForm.email || loginForm.email,
                  });
                  setAuthPanelMode('password_reset_request');
                  setLoginError(null);
                }}
              >
                {t('auth.forgot_password')}
              </button>
            ) : null}
            {providers?.local.enabled && providers.local.selfSignupEnabled ? (
              <button
                className="ghost-button"
                type="button"
                disabled={isAuthenticating}
                onClick={() => {
                  setAuthPanelMode('sign_up');
                  setLoginError(null);
                }}
              >
                {t('auth.sign_up')}
              </button>
            ) : null}
            {betaSignupEnabled ? (
              <button
                className="ghost-button"
                type="button"
                disabled={isAuthenticating}
                onClick={() => {
                  setAuthPanelMode('request_access');
                  setLoginError(null);
                }}
              >
                Request access
              </button>
            ) : null}
          </div>
        </form>
      )}
    </article>
  );
}

function readLoginEmailFromRoute() {
  const loginEmail = new URL(window.location.href).searchParams.get('loginEmail');
  return loginEmail ? loginEmail.trim() : '';
}
