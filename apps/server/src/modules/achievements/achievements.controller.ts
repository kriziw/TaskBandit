import { Controller, Delete, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AchievementsService } from "./achievements.service";

@ApiTags("achievements")
@Controller("api/achievements")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getForCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.achievementsService.getForUser(user.id, user.householdId);
  }

  @Get("household")
  getForHousehold(@CurrentUser() user: AuthenticatedUser) {
    return this.achievementsService.getForHousehold(user.householdId);
  }

  @Delete("reset")
  @Roles("admin")
  resetForHousehold(@CurrentUser() user: AuthenticatedUser) {
    return this.achievementsService.resetForHousehold(user.householdId);
  }
}
