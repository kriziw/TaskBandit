# Package Feature Access

This document describes how subscription-tier feature flags flow from the control plane to the app server and through to each client interface.

## Overview

Every hosted tenant is assigned a set of boolean feature flags (`featureAccess`) that define which product capabilities are available under their subscription package. The control plane is the authoritative source. The app server fetches and enforces those flags on every guarded request. Clients apply them as UI gates and fall back to deny when flags are absent.

Self-hosted deployments receive full access to all features; the control-plane dependency is not required.

---

## The 12 Feature Flags

| Feature ID | What it controls |
|---|---|
| `templates_manage` | Create, update, and delete chore templates |
| `chores_manage` | Schedule, edit, cancel, and close chore instances |
| `reassignment` | Change assignees on active chore instances |
| `takeover_direct` | Take over a chore directly without a request/approval step |
| `takeover_requests` | Request, approve, and decline takeover flows |
| `approvals` | Submit, approve, and reject completion review flows |
| `proof_uploads` | Attach proof photos/files to completions |
| `follow_up_automation` | Configure template dependencies and automatic follow-up chores |
| `external_completion` | Mark chores completed by someone outside the household |
| `deferred_follow_up_control` | Release, snooze, and manage deferred follow-up chores |
| `quick_log` | Log ad-hoc chores with free-text completions |
| `rewards_manage` | Create, manage, and redeem household rewards |

---

## Data Flow

```
Control Plane (authoritative)
  └── Package catalog: explicit featureAccess per package revision
  └── Tenant plan assignment: featureAccess copied from the published revision
  └── Runtime config endpoint: GET /internal/runtime/tenants/:tenantId/config
          → { featureAccess: Record<featureId, boolean>, ... }
            (cached in the app server for ≤5 minutes; stale window: additional 5 minutes)

App Server
  └── HostedRuntimeConfigService: fetches & caches the runtime config
  └── FeatureAccessService.getFeatureAccessForTenant(): normalises and returns FeatureAccess
  └── GET /api/auth/me: embeds featureAccess in the AuthenticatedUser response (refreshed on every call)
  └── FeatureGuard / requireFeature(): re-fetches fresh featureAccess from CP on every guarded request

Web client
  └── featureAccess object built from currentUser.featureAccess (from /api/auth/me)
  └── hasFeature(featureId) → boolean; used to show/hide UI elements

Android client
  └── MobileFeatureAccess parsed from /api/dashboard (which embeds user.featureAccess)
  └── Stored as first-class DashboardUiState.featureAccess; persisted across launches from cache
  └── All defaults are false (deny-by-default); flags only become true when the server returns them
```

---

## Server-Side Enforcement

### FeatureGuard (controller level)

Applied to controller classes alongside `JwtAuthGuard` and `RolesGuard`:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
```

Routes decorated with `@RequiresFeature('feature_id')` are blocked with `403 package_feature_disabled` if that flag is disabled for the tenant. Routes without the decorator are always passed through.

In **hosted mode**, the guard re-fetches the tenant's current feature access from the control plane on every request so plan downgrades take effect immediately without requiring a re-login.

In **self-hosted mode**, feature access is read from the JWT; all features default to enabled.

### Service-layer requireFeature (conditional checks)

Some features (`follow_up_automation`, `reassignment`, `approvals`) depend on input values rather than being unconditional on a route. These use a private `requireFeature(user, featureId)` helper inside the service which applies the same hosted/self-hosted branching logic as `FeatureGuard`.

### Error response shape

```json
{
  "statusCode": 403,
  "message": "The rewards_manage feature is not enabled for this package.",
  "error": "Forbidden",
  "code": "package_feature_disabled"
}
```

---

## Client-Side Gating

### Web

`featureAccess` is assembled from `currentUser.featureAccess` returned by `GET /api/auth/me`. The `hostedSubscription` endpoint is **not** used as a gating source — it is display-only (the subscription info panel).

```typescript
const featureAccess = {
  ...fullFeatureAccess,              // all-true baseline for self-hosted
  ...(payload?.currentUser.featureAccess ?? {}),  // override with server-authoritative flags
};
const hasFeature = (featureId) => featureAccess[featureId];
```

API calls for optional features (e.g. rewards) are wrapped in `loadOptionalFeature(() => api.call(), fallback)` which silently swallows `403 package_feature_disabled`, `404`, `405`, and `501` responses and returns the fallback value instead of crashing.

### Android

`MobileFeatureAccess` is parsed from the dashboard API response and stored as a first-class field in `DashboardUiState`. All field defaults are `false`; the app is in a deny-by-default state until the first successful server response arrives.

Parser functions (`parseFeatureAccessFromApi`, `parseFeatureAccessCached`) use `optBoolean(key, false)` for every field — if the server omits a flag, it defaults to **denied**.

Helpers in the view model read directly from `_uiState.value.featureAccess`; no OR-fallback to `hostedSubscription.featureAccess` is applied.

---

## Deny-By-Default Policy

The system is designed to fail towards restriction, not permissiveness:

| Layer | Behaviour when flag is absent |
|---|---|
| Control plane → app server (hosted) | `normalizeFeatureAccess` falls back to `true` for unknown fields only, for backward compatibility with older tenant records. New package revisions must explicitly set every flag. |
| App server → client (`/api/auth/me`) | All 12 flags are always present in the response after normalisation. |
| Android parser defaults | `false` — missing JSON keys are treated as denied |
| Android initial `DashboardUiState` | `MobileFeatureAccess()` constructor, which is all-`false` by default |
| Web `fullFeatureAccess` | All-`true` — used as self-hosted baseline only; always overridden by `currentUser.featureAccess` in hosted mode |

---

## Adding a New Feature Flag

1. Add the new ID to `packageFeatureIds` in `apps/server/src/common/tenancy/feature-access.service.ts`.
2. Add the corresponding entry to `packageFeatureCatalog` in the control-plane `apps/control-plane/src/domain/package-catalog.ts` (with `id`, `label`, `description`).
3. Add `@RequiresFeature('new_feature')` to any controller routes that must be gated, or add a `requireFeature(user, 'new_feature')` call in service methods with conditional logic.
4. Add the field to `MobileFeatureAccess` in the Android models with a `= false` default.
5. Add parser entries (`optBoolean('key', false)`) in both `parseFeatureAccessFromApi` and `parseFeatureAccessCached`.
6. Add a `featureAccess` type field in `apps/web/src/types/taskbandit.ts`.
7. Update all existing package revisions in the control plane to explicitly set the new flag (the revision creation endpoint now enforces explicit specification; existing revisions may default to `true` via backward-compat normalisation until updated).
8. Update `featureLabelMap` in `apps/web/src/App.tsx` with the canonical label.

---

## Related Documents

- [Hosted Runtime Tenancy](hosted-runtime-tenancy.md)
- [Control Plane: Package Feature Access](../TaskBandit-control-plane/docs/package-feature-access.md) *(see control-plane repo)*
