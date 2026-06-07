import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../common/config/app-config.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AppConfigModule, PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
