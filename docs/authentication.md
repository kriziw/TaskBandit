# Authentication

TaskBandit now includes local auth plus an optional OIDC login flow in the NestJS backend.

## Current Capabilities

- Bootstrap can create the first household owner as a real local account.
- Local login returns a JWT bearer token.
- Self-signup can create `parent` accounts when household settings allow it.
- Auth provider discovery exposes local auth plus current OIDC configuration status.
- Optional OIDC sign-in is available through a server-managed authorization-code flow.
- Admins can manage household auth settings from the web UI.
- `GET /api/auth/me` resolves the current user from a bearer token.
- Protected business endpoints can now rely on bearer-token auth and role-aware guards.

## Current Endpoints

- `GET /api/auth/providers`
- `GET /api/auth/oidc/start`
- `GET /api/auth/oidc/callback`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`
- `GET /api/bootstrap/status`
- `POST /api/bootstrap/household`

## Environment Variables

- `TASKBANDIT_JWT_SECRET`
- `TASKBANDIT_JWT_EXPIRES_IN`
- `TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED`
- `TASKBANDIT_OIDC_ENABLED`
- `TASKBANDIT_OIDC_AUTHORITY`
- `TASKBANDIT_OIDC_CLIENT_ID`
- `TASKBANDIT_OIDC_CLIENT_SECRET`
- `TASKBANDIT_OIDC_SCOPE`

## Notes

- OIDC is optional and disabled by default. Local auth works without any OIDC settings.
- Local auth can now be disabled from the admin UI.
- `TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED=true` is the recovery override. It force-keeps local sign-in available even if the UI setting disables it, so you still have a way back in if OIDC breaks.
- Set `TASKBANDIT_OIDC_ENABLED=true` only when you also provide valid authority and client ID values.
- The current OIDC flow is targeted at Authentik-style providers and uses the provider metadata document at `/.well-known/openid-configuration`.
- Configure your OIDC provider redirect URI as `http(s)://<taskbandit-base-url>/api/auth/oidc/callback`.
- UI-managed OIDC settings take precedence over environment-based fallback OIDC.
- Environment-based `TASKBANDIT_OIDC_*` values remain available as a fallback path if you prefer to keep provider config outside the UI.
- If an OIDC identity already matches an existing TaskBandit email address, TaskBandit links that OIDC identity to the existing user.
- If no linked account exists yet, TaskBandit can create a new `parent` account only when household self-signup is enabled.
- Current local auth is intended as the project foundation; role-aware authorization guards and password reset flows still need to be added.
- For demo-seeded environments, the seeded users share the password `TaskBandit123!`.
