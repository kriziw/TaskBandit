import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { SmtpService } from "../settings/smtp.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardSyncService } from "./dashboard-sync.service";
import { DashboardService } from "./dashboard.service";
import { EmailDeliveryWorkerService } from "./email-delivery-worker.service";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";
import { ReminderWorkerService } from "./reminder-worker.service";

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardSyncService,
    DashboardService,
    HouseholdRepository,
    ReminderWorkerService,
    PushDeliveryWorkerService,
    EmailDeliveryWorkerService,
    SmtpService
  ],
  exports: [DashboardSyncService]
})
export class DashboardModule {}
