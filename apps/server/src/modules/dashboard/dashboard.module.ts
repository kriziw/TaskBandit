import { Module } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { SmtpService } from "../settings/smtp.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardSyncController } from "./dashboard-sync.controller";
import { DashboardSyncService } from "./dashboard-sync.service";
import { DashboardService } from "./dashboard.service";
import { EmailDeliveryWorkerService } from "./email-delivery-worker.service";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";
import { ReminderWorkerService } from "./reminder-worker.service";
import { TenantDataManifestService } from "./tenant-data-manifest.service";

@Module({
  controllers: [DashboardController, DashboardSyncController],
  providers: [
    DashboardSyncService,
    DashboardService,
    AuthService,
    HouseholdRepository,
    ReminderWorkerService,
    PushDeliveryWorkerService,
    EmailDeliveryWorkerService,
    SmtpService,
    TenantDataManifestService
  ],
  exports: [DashboardSyncService]
})
export class DashboardModule {}
