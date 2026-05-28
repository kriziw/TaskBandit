import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppConfigModule } from './common/config/app-config.module';
import { TenantContextMiddleware } from './common/http/tenant-context.middleware';
import { I18nModule } from './common/i18n/i18n.module';
import { LoggingModule } from './common/logging/logging.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { PushModule } from './common/push/push.module';
import { AuthModule } from './modules/auth/auth.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { ChoresModule } from './modules/chores/chores.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { HouseholdModule } from './modules/household/household.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RewardsModule } from './modules/rewards/rewards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AppConfigModule,
    I18nModule,
    LoggingModule,
    PrismaModule,
    PushModule,
    AuthModule,
    BootstrapModule,
    DashboardModule,
    HouseholdModule,
    SettingsModule,
    ChoresModule,
    GamificationModule,
    AchievementsModule,
    RewardsModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Resolve the tenant request context once per request so every guard,
    // controller, and service can read req.tenantContext without re-computing it.
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
