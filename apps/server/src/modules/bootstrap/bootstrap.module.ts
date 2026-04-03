import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HouseholdRepository } from "../household/household.repository";
import { BootstrapController } from "./bootstrap.controller";
import { BootstrapService } from "./bootstrap.service";

@Module({
  imports: [AuthModule],
  controllers: [BootstrapController],
  providers: [BootstrapService, HouseholdRepository]
})
export class BootstrapModule {}
