import { Module } from "@nestjs/common";
import { HouseholdRepository } from "./household.repository";

/**
 * HouseholdModule — shared data-access layer for all household-related operations.
 *
 * ## Design rationale
 *
 * `HouseholdRepository` is a cross-cutting infrastructure class that is consumed by
 * several feature modules (Bootstrap, Chores, Dashboard, Settings). Rather than each
 * feature module registering it as a local provider (which would create a separate
 * instance per module context), HouseholdModule provides and exports a single
 * application-scoped instance that every importer shares.
 *
 * ## Module boundary
 *
 * This module is intentionally repository-only — there is no HouseholdController or
 * HouseholdService here. Household-level HTTP routes and orchestration logic live in
 * the feature modules that own those user-facing operations:
 *
 *   - Initial household creation  →  BootstrapModule (bootstrap.service.ts)
 *   - Settings / members / devices →  SettingsModule  (settings.service.ts)
 *   - Chore instances & templates  →  ChoresModule    (chores.service.ts)
 *   - Dashboard, push, reminders   →  DashboardModule (dashboard.service.ts)
 *
 * HouseholdRepository is the single source of truth for all Prisma queries that
 * touch household-owned data. Feature services delegate persistence exclusively to
 * this repository rather than importing PrismaService themselves.
 */
@Module({
  providers: [HouseholdRepository],
  exports: [HouseholdRepository]
})
export class HouseholdModule {}
