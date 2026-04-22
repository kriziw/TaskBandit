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
