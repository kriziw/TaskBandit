import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { HouseholdModule } from '../household/household.module';
import { RewardsModule } from '../rewards/rewards.module';
import { SmtpService } from '../settings/smtp.service';
import { DashboardController } from './dashboard.controller';
import { DashboardSyncController } from './dashboard-sync.controller';
import { DashboardSyncService } from './dashboard-sync.service';
import { DashboardService } from './dashboard.service';
import { EmailDeliveryWorkerService } from './email-delivery-worker.service';
import { LeaderboardResetService } from './leaderboard-reset.service';
import { HostedPushDiagnosticsController } from './hosted-push-diagnostics.controller';
import { HostedPushDiagnosticsService } from './hosted-push-diagnostics.service';
import { PushDeliveryWorkerService } from './push-delivery-worker.service';
import { ReminderWorkerService } from './reminder-worker.service';
import { RuntimeTenantScopeResolverService } from './runtime-tenant-scope-resolver.service';
import { TenantDataManifestService } from './tenant-data-manifest.service';

@Module({
  imports: [HouseholdModule, RewardsModule],
  controllers: [DashboardController, DashboardSyncController, HostedPushDiagnosticsController],
  providers: [
    DashboardSyncService,
    DashboardService,
    LeaderboardResetService,
    HostedPushDiagnosticsService,
    RuntimeTenantScopeResolverService,
    AuthService,
    ReminderWorkerService,
    PushDeliveryWorkerService,
    EmailDeliveryWorkerService,
    SmtpService,
    TenantDataManifestService,
  ],
  exports: [DashboardSyncService],
})
export class DashboardModule {}
