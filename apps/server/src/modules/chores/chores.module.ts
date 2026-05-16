import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { GamificationModule } from "../gamification/gamification.module";
import { HouseholdRepository } from "../household/household.repository";
import { ChoresController } from "./chores.controller";
import { HostedTemplateSeedController } from "./hosted-template-seed.controller";
import { ChoresService } from "./chores.service";
import { ProofStorageService } from "./proof-storage.service";

@Module({
  imports: [GamificationModule, DashboardModule, AchievementsModule],
  controllers: [ChoresController, HostedTemplateSeedController],
  providers: [ChoresService, HouseholdRepository, ProofStorageService]
})
export class ChoresModule {}
