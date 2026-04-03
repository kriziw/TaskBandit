import { Module } from "@nestjs/common";
import { GamificationController } from "./gamification.controller";
import { PointsService } from "./points.service";

@Module({
  controllers: [GamificationController],
  providers: [PointsService],
  exports: [PointsService]
})
export class GamificationModule {}

