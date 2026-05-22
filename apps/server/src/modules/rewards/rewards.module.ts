import { Module } from "@nestjs/common";
import { RewardsController } from "./rewards.controller";
import { HostedRewardSeedController } from "./hosted-reward-seed.controller";
import { RewardsService } from "./rewards.service";
import { RewardsRepository } from "./rewards.repository";

@Module({
  controllers: [RewardsController, HostedRewardSeedController],
  providers: [RewardsService, RewardsRepository],
  exports: [RewardsService, RewardsRepository]
})
export class RewardsModule {}
