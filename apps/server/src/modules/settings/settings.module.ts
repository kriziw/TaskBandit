import { Module } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { SmtpService } from "./smtp.service";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, HouseholdRepository, SmtpService]
})
export class SettingsModule {}
