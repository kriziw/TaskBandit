import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ReminderWorkerService } from "./reminder-worker.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, HouseholdRepository, ReminderWorkerService]
})
export class DashboardModule {}
