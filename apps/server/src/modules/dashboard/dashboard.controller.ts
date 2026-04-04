import { Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Controller("api/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(user);
  }

  @Get("points-ledger")
  getPointsLedger(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getPointsLedger(user);
  }

  @Get("notifications")
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getNotifications(user);
  }

  @Post("notifications/:id/read")
  markNotificationRead(@CurrentUser() user: AuthenticatedUser, @Param("id") notificationId: string) {
    return this.dashboardService.markNotificationRead(user, notificationId);
  }

  @Post("notifications/read-all")
  markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.markAllNotificationsRead(user);
  }

  @Post("maintenance/process-overdue")
  @Roles("admin")
  processOverduePenalties(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.processOverduePenalties(user);
  }

  @Post("maintenance/process-notifications")
  @Roles("admin")
  processNotificationMaintenance() {
    return this.dashboardService.processNotificationMaintenance();
  }

  @Get("exports/chores.csv")
  async exportChores(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="taskbandit-chores.csv"');
    return this.dashboardService.exportChoresCsv(user);
  }
}
