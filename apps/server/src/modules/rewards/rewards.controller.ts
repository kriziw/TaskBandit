import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { RewardsService } from "./rewards.service";
import { CreateRewardDto } from "./dto/create-reward.dto";
import { UpdateRewardDto } from "./dto/update-reward.dto";
import { RedeemRewardDto } from "./dto/redeem-reward.dto";
import { ResolveRedemptionDto } from "./dto/resolve-redemption.dto";

@ApiTags("rewards")
@Controller("api/rewards")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @Roles("admin", "parent", "child")
  getRewards(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.getRewards(user);
  }

  @Post()
  @Roles("admin", "parent")
  createReward(@Body() dto: CreateRewardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.createReward(dto, user);
  }

  @Put(":id")
  @Roles("admin", "parent")
  updateReward(
    @Param("id") rewardId: string,
    @Body() dto: UpdateRewardDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.rewardsService.updateReward(rewardId, dto, user);
  }

  @Patch(":id/toggle")
  @Roles("admin", "parent")
  toggleReward(@Param("id") rewardId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.toggleReward(rewardId, user);
  }

  @Delete(":id")
  @Roles("admin", "parent")
  deleteReward(@Param("id") rewardId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.deleteReward(rewardId, user);
  }

  @Post(":id/redeem")
  @Roles("child")
  redeemReward(
    @Param("id") rewardId: string,
    @Body() dto: RedeemRewardDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.rewardsService.redeemReward(rewardId, dto, user);
  }

  @Get("redemptions")
  @Roles("admin", "parent", "child")
  getRedemptions(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.getRedemptions(user);
  }

  @Post("redemptions/:id/resolve")
  @Roles("admin", "parent")
  resolveRedemption(
    @Param("id") redemptionId: string,
    @Body() dto: ResolveRedemptionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.rewardsService.resolveRedemption(redemptionId, dto, user);
  }
}
