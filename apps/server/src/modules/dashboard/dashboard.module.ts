import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, HouseholdRepository]
})
export class DashboardModule {}

