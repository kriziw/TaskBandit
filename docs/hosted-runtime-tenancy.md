# Hosted Runtime Tenancy

This note captures the public runtime boundary for hosted TaskBandit while preserving the normal self-hosted flow.

## Default Behavior

- Self-hosted remains the default.
- `TASKBANDIT_HOSTED_MODE=false` means permissive local behavior with no control-plane dependency.
- Hosted lifecycle, plan, quota, and suspension state are consumed only through the trusted internal runtime contract.

## Tenant Context

- Tenant context comes from trusted server-side state such as the request host, a hosted tenant path, or hosted runtime tenant binding.
- Browser clients do not submit authoritative tenant ids.
- Auth/session validation rejects tokens that do not match the resolved tenant.

Hosted deployments can use either:

- subdomain routing, such as `family.taskbandit.app`
- fixed-host path routing, such as `my.taskbandit.app/t/family` and `api.taskbandit.app/t/family/...`

Self-hosted remains the normal default and does not require either hosted routing mode.

## Runtime Config Contract Troubleshooting

Hosted runtime policy and auth flows depend on control-plane runtime config reads. The runtime bridge calls:

- `GET /internal/runtime/tenants/:tenantId/config`

Expected behavior:

- `:tenantId` is the runtime tenant id resolved from trusted runtime context.
- Control plane may support control-plane-tenant-id fallback for compatibility, but runtime callers should use runtime tenant id.
- Calls require `x-internal-service-token` and private/internal networking between runtime and control plane.
- Runtime sends `x-taskbandit-runtime-contract-version` (semver) so control-plane can enforce compatibility.

Runtime bridge contract compatibility (`soft` mode, current contract `1.0.0`):

| Runtime declared contract version | Result |
| --- | --- |
| _missing header_ | Allowed for backward compatibility |
| `1.x.x` | Allowed |
| non-`1` major or malformed declared semver | Rejected with `409` and reason `runtime_contract_version_incompatible` |

Safe failure categories surfaced by runtime responses/logs include:

- `token_missing`
- `token_invalid`
- `runtime_tenant_not_mapped`
- `control_plane_unavailable`
- `runtime_contract_version_incompatible`

Successful runtime-config reads also carry customer-facing package metadata (`packageDisplayName`) so the runtime can show friendly plan labels while retaining technical package codes for diagnostics.

Integration contract note:

- runtime config now includes `tenantConfig.integrations` (active provider metadata plus basic/deep health summaries)
- the payload does not include raw integration secrets
- runtime config can also include `tenantConfig.hostedPushConfig.fcm` for hosted/shared FCM delivery in hosted mode

Hosted push diagnostics note:

- runtime exposes internal-token protected operator bridge endpoints used by control-plane diagnostics:
  - `GET /internal/runtime/tenants/:tenantId/users/:userId/notification-devices`
  - `POST /internal/runtime/tenants/:tenantId/push/device-tests`
- targeted device test push requests validate tenant/user/device ownership before enqueueing delivery.

## Package Feature Access

Each hosted tenant's subscription package includes a set of boolean feature flags (`featureAccess`) that gate specific product capabilities. The control plane is the authoritative source; the runtime enforces these flags on every guarded API request.

Key properties of the mechanism:

- **Server-side**: `FeatureGuard` and `@RequiresFeature('feature_id')` decorators re-fetch the tenant's current feature access from the control plane on every request in hosted mode. Plan downgrades take effect immediately — no re-login required.
- **Client-side (web)**: `currentUser.featureAccess` from `/api/auth/me` is the sole source of truth. The `hostedSubscription` endpoint is informational only and is never used as a gating source.
- **Client-side (Android)**: `MobileFeatureAccess` is stored as a first-class field in `DashboardUiState` with all flags defaulting to `false`. The app is in a deny-by-default state until the first successful server response arrives.
- **Caching**: the app server caches the runtime config for up to 5 minutes. A 5-minute stale window follows expiry before the cache is invalidated.
- **Self-hosted mode**: all 12 features are enabled by default; no control-plane dependency.

See [Package Feature Access](feature-access.md) for the full chain-of-custody documentation including the 12 feature flag IDs, the enforcement architecture, and the steps for adding a new feature.

## Hosted Template Availability

Hosted tenants should always have starter templates available for chore creation.

- Eager path: provisioning can call the internal template seed hook.
- Lazy safety path: runtime template reads seed defaults automatically if the tenant has zero templates.
- Package feature controls still govern template editing operations (create/update/delete), while chore creation can use available templates as long as chore-management permissions are active.

If a hosted tenant reports an empty template list, check runtime logs for the hosted template seed trigger/result and verify the tenant role has access to `/api/chores/templates` (`admin` or `parent`).

## Tenant-Aware Runtime Enforcement

The runtime now enforces hosted policy at the public boundary for:

- household member creation
- proof uploads
- notification enqueueing
- push/email delivery workers
- notification retry operations

Suspended or inactive hosted tenants are blocked from risky or resource-consuming actions while still allowing safe reads and export-oriented inspection.

## Tenant-Scoped Storage

Proof uploads are stored behind an object-style storage abstraction with a local default implementation. Proof keys use this prefix:

```text
tenants/<tenantId>/proofs/<householdId>/<generated-file>
```

Upload, download, delete, and object-listing paths validate the tenant prefix before touching storage.

## Export And Deletion Manifests

Tenant admins can now pull two runtime manifests:

- `GET /api/dashboard/admin/exports/tenant-manifest.json`
- `GET /api/dashboard/admin/deletion/tenant-manifest.json`

Each manifest inventories:

- tenant and household identifiers
- effective hosted runtime lifecycle/quota state
- tenant-owned database row ids
- proof object keys and byte totals

These manifests are generic public-runtime hooks only. Private control-plane orchestration, approval, and operator workflows stay outside this repo.

## Android Hosted Onboarding Handoff

Hosted Android onboarding is now link-driven by default:

- HTTPS app-link style onboarding URLs (for example `/activate?invite=...`) can open the app directly.
- Custom scheme onboarding URLs (`taskbandit://onboarding?...`) are also supported for explicit mobile handoff paths.
- Invite payloads carry tenant slug and canonical tenant API URL hints, so Android can resolve the invite and target the correct tenant runtime without manual API URL guessing.

Self-hosted setup is still available from Android as an explicit advanced path.
