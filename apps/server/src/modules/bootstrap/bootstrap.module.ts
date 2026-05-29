import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HouseholdModule } from '../household/household.module';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [AuthModule, HouseholdModule],
  controllers: [BootstrapController],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
