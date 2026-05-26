import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { GamificationModule } from "../gamification/gamification.module";
import { HouseholdModule } from "../household/household.module";
import { ChoresController } from "./chores.controller";
import { HostedTemplateSeedController } from "./hosted-template-seed.controller";
import { ChoresService } from "./chores.service";
import { ProofStorageService } from "./proof-storage.service";

@Module({
  imports: [GamificationModule, DashboardModule, AchievementsModule, HouseholdModule],
  controllers: [ChoresController, HostedTemplateSeedController],
  providers: [ChoresService, ProofStorageService]
})
export class ChoresModule {}
