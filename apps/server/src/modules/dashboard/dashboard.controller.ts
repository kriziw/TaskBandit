import { Body, Controller, Get, Header, MessageEvent, Param, Post, Query, Res, Sse, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Observable } from "rxjs";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { DashboardSyncService } from "./dashboard-sync.service";
import { SendTestNotificationDto } from "./dto/send-test-notification.dto";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Controller("api/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardSyncService: DashboardSyncService
  ) {}

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

  @Sse("sync/stream")
  @Header("Cache-Control", "no-cache")
  @Header("X-Accel-Buffering", "no")
  streamSync(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.dashboardSyncService.streamForHousehold(user.householdId);
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

  @Post("maintenance/test-notification")
  @Roles("admin")
  sendTestNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendTestNotificationDto
  ) {
    return this.dashboardService.sendTestNotification(user, dto.recipientUserId);
  }

  @Get("admin/logs")
  @Roles("admin")
  getRuntimeLogs(@Query("limit") limit?: string) {
    return this.dashboardService.getRuntimeLogs(Number(limit) || 200);
  }

  @Get("admin/system-status")
  @Roles("admin")
  getSystemStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSystemStatus(user);
  }

  @Get("admin/backup-readiness")
  @Roles("admin")
  getBackupReadiness(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getBackupReadiness(user);
  }

  @Get("admin/notification-recovery")
  @Roles("admin")
  getNotificationRecovery(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getNotificationRecovery(user);
  }

  @Post("admin/notification-recovery/push/:deliveryId/retry")
  @Roles("admin")
  retryPushDelivery(@CurrentUser() user: AuthenticatedUser, @Param("deliveryId") deliveryId: string) {
    return this.dashboardService.retryPushDelivery(user, deliveryId);
  }

  @Post("admin/notification-recovery/email/:notificationId/retry")
  @Roles("admin")
  retryEmailDelivery(@CurrentUser() user: AuthenticatedUser, @Param("notificationId") notificationId: string) {
    return this.dashboardService.retryEmailDelivery(user, notificationId);
  }

  @Get("admin/logs/export.txt")
  @Roles("admin")
  async exportRuntimeLogsText(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="taskbandit-runtime.log"');
    return this.dashboardService.exportRuntimeLogsText();
  }

  @Get("admin/logs/export.json")
  @Roles("admin")
  async exportRuntimeLogsJson(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="taskbandit-runtime-logs.json"');
    return this.dashboardService.exportRuntimeLogsJson();
  }

  @Get("admin/exports/household.json")
  @Roles("admin")
  async exportHouseholdSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="taskbandit-household-snapshot.json"');
    return this.dashboardService.exportHouseholdSnapshot(user);
  }

  @Get("exports/chores.csv")
  async exportChores(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="taskbandit-chores.csv"');
    return this.dashboardService.exportChoresCsv(user);
  }
}
