import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { BootstrapController } from "./bootstrap.controller";
import { BootstrapService } from "./bootstrap.service";

@Module({
  controllers: [BootstrapController],
  providers: [BootstrapService, HouseholdRepository]
})
export class BootstrapModule {}

