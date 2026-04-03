import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { ChoresController } from "./chores.controller";
import { ChoresService } from "./chores.service";

@Module({
  controllers: [ChoresController],
  providers: [ChoresService, HouseholdRepository]
})
export class ChoresModule {}

