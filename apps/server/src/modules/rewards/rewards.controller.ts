import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { FeatureGuard } from '../../common/auth/feature.guard';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequiresFeature } from '../../common/auth/requires-feature.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { ResolveRedemptionDto } from './dto/resolve-redemption.dto';
import { RescheduleRedemptionDto } from './dto/reschedule-redemption.dto';

@ApiTags('rewards')
@Controller('api/rewards')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @Roles('admin', 'parent', 'child')
  @RequiresFeature('rewards_manage')
  getRewards(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.getRewards(user);
  }

  @Post()
  @Roles('admin')
  @RequiresFeature('rewards_manage')
  createReward(@Body() dto: CreateRewardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.createReward(dto, user);
  }

  @Put(':id')
  @Roles('admin')
  @RequiresFeature('rewards_manage')
  updateReward(
    @Param('id') rewardId: string,
    @Body() dto: UpdateRewardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.updateReward(rewardId, dto, user);
  }

  @Patch(':id/toggle')
  @Roles('admin')
  @RequiresFeature('rewards_manage')
  toggleReward(@Param('id') rewardId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.toggleReward(rewardId, user);
  }

  @Delete(':id')
  @Roles('admin')
  @RequiresFeature('rewards_manage')
  deleteReward(@Param('id') rewardId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.deleteReward(rewardId, user);
  }

  @Post(':id/redeem')
  @Roles('child')
  @RequiresFeature('rewards_manage')
  redeemReward(
    @Param('id') rewardId: string,
    @Body() dto: RedeemRewardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.redeemReward(rewardId, dto, user);
  }

  @Get('redemptions')
  @Roles('admin', 'parent', 'child')
  @RequiresFeature('rewards_manage')
  getRedemptions(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.getRedemptions(user);
  }

  @Post('redemptions/:id/resolve')
  @Roles('admin', 'parent')
  @RequiresFeature('rewards_manage')
  resolveRedemption(
    @Param('id') redemptionId: string,
    @Body() dto: ResolveRedemptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.resolveRedemption(redemptionId, dto, user);
  }

  @Patch('redemptions/:id/reschedule')
  @Roles('admin', 'parent', 'child')
  rescheduleRedemption(
    @Param('id') redemptionId: string,
    @Body() dto: RescheduleRedemptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.rescheduleRedemption(redemptionId, dto, user);
  }
}
