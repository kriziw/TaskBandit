# Authentication

TaskBandit now includes a first-pass authentication foundation in the NestJS backend.

## Current Capabilities

- Bootstrap can create the first household owner as a real local account.
- Local login returns a JWT bearer token.
- Self-signup can create `parent` accounts when household settings allow it.
- Auth provider discovery exposes local auth plus current OIDC configuration status.
- `GET /api/auth/me` resolves the current user from a bearer token.
- Protected business endpoints can now rely on bearer-token auth and role-aware guards.

## Current Endpoints

- `GET /api/auth/providers`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`
- `GET /api/bootstrap/status`
- `POST /api/bootstrap/household`

## Environment Variables

- `TASKBANDIT_JWT_SECRET`
- `TASKBANDIT_JWT_EXPIRES_IN`
- `TASKBANDIT_OIDC_AUTHORITY`
- `TASKBANDIT_OIDC_CLIENT_ID`
- `TASKBANDIT_OIDC_CLIENT_SECRET`

## Notes

- OIDC is currently configuration-ready and targeted at Authentik, but the interactive authorization-code flow is not implemented yet.
- Current local auth is intended as the project foundation; role-aware authorization guards and password reset flows still need to be added.
- For demo-seeded environments, the seeded users share the password `TaskBandit123!`.
