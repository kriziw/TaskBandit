import { Module } from "@nestjs/common";
import { GamificationModule } from "../gamification/gamification.module";
import { HouseholdRepository } from "../household/household.repository";
import { ChoresController } from "./chores.controller";
import { ChoresService } from "./chores.service";
import { ProofStorageService } from "./proof-storage.service";

@Module({
  imports: [GamificationModule],
  controllers: [ChoresController],
  providers: [ChoresService, HouseholdRepository, ProofStorageService]
})
export class ChoresModule {}
