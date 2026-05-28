import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SmtpService } from './smtp.service';

@Module({
  imports: [HouseholdModule],
  controllers: [SettingsController],
  providers: [SettingsService, SmtpService],
})
export class SettingsModule {}
