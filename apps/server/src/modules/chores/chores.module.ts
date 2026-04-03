import { Module } from "@nestjs/common";
import { GamificationModule } from "../gamification/gamification.module";
import { HouseholdRepository } from "../household/household.repository";
import { ChoresController } from "./chores.controller";
import { ChoresService } from "./chores.service";

@Module({
  imports: [GamificationModule],
  controllers: [ChoresController],
  providers: [ChoresService, HouseholdRepository]
})
export class ChoresModule {}
