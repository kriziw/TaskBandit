import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { AppLogService } from "../../common/logging/app-log.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { EmailDeliveryWorkerService } from "./email-delivery-worker.service";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";
import { ReminderWorkerService } from "./reminder-worker.service";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly appConfigService: AppConfigService,
    private readonly appLogService: AppLogService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly reminderWorkerService: ReminderWorkerService,
    private readonly emailDeliveryWorkerService: EmailDeliveryWorkerService,
    private readonly pushDeliveryWorkerService: PushDeliveryWorkerService
  ) {}

  getSummary(user: AuthenticatedUser) {
    return this.repository.getDashboardSummary(user.householdId);
  }

  getPointsLedger(user: AuthenticatedUser) {
    return this.repository.getPointsLedger(user.householdId);
  }

  getNotifications(user: AuthenticatedUser) {
    return this.repository.getNotifications(user.householdId, user.id);
  }

  createSyncToken(user: AuthenticatedUser) {
    return this.authService.createDashboardSyncToken(user);
  }

  markNotificationRead(user: AuthenticatedUser, notificationId: string) {
    return this.repository.markNotificationRead(notificationId, user.householdId, user.id);
  }

  markAllNotificationsRead(user: AuthenticatedUser) {
    return this.repository.markAllNotificationsRead(user.householdId, user.id);
  }

  processOverduePenalties(user: AuthenticatedUser) {
    return this.repository.processOverduePenalties(user.householdId, user.id);
  }

  async processNotificationMaintenance() {
    const [reminderResult, deliveryResult] = await Promise.all([
      this.reminderWorkerService.runOnce(),
      this.processNotificationDeliveries()
    ]);

    return {
      reminderCount: reminderResult.reminderCount,
      dailySummaryCount: reminderResult.dailySummaryCount,
      pushSentCount: deliveryResult.pushSentCount,
      pushFailedCount: deliveryResult.pushFailedCount,
      emailSentCount: deliveryResult.emailSentCount,
      emailFailedCount: deliveryResult.emailFailedCount,
      emailSkippedCount: deliveryResult.emailSkippedCount
    };
  }

  async sendTestNotification(user: AuthenticatedUser, recipientUserId?: string) {
    const notificationResult = await this.repository.createAdminTestNotification({
      householdId: user.householdId,
      actorUserId: user.id,
      actorDisplayName: user.displayName,
      recipientUserId: recipientUserId ?? user.id
    });

    const deliveryResult = await this.processNotificationDeliveries();

    return {
      recipientUserId: notificationResult.recipientUserId,
      recipientDisplayName: notificationResult.recipientDisplayName,
      reminderCount: 0,
      dailySummaryCount: 0,
      ...deliveryResult
    };
  }

  getNotificationRecovery(user: AuthenticatedUser) {
    return this.repository.getNotificationRecovery(user.householdId);
  }

  private async processNotificationDeliveries() {
    const [pushDeliveryResult, emailDeliveryResult] = await Promise.all([
      this.pushDeliveryWorkerService.runOnce(50),
      this.emailDeliveryWorkerService.runOnce(50)
    ]);

    return {
      pushSentCount: pushDeliveryResult.sentCount,
      pushFailedCount: pushDeliveryResult.failedCount,
      emailSentCount: emailDeliveryResult.sentCount,
      emailFailedCount: emailDeliveryResult.failedCount,
      emailSkippedCount: emailDeliveryResult.skippedCount
    };
  }

  async retryPushDelivery(user: AuthenticatedUser, deliveryId: string) {
    await this.repository.retryFailedPushDelivery(user.householdId, user.id, deliveryId);
    const deliveryResult = await this.pushDeliveryWorkerService.runOnce(50);

    return {
      deliveryId,
      ...deliveryResult
    };
  }

  async retryEmailDelivery(user: AuthenticatedUser, notificationId: string) {
    await this.repository.retryFailedEmailDelivery(user.householdId, user.id, notificationId);
    const deliveryResult = await this.emailDeliveryWorkerService.runOnce(50);

    return {
      notificationId,
      ...deliveryResult
    };
  }

  async exportChoresCsv(user: AuthenticatedUser) {
    const [household, instances] = await Promise.all([
      this.repository.getHousehold(user.householdId),
      this.repository.getInstances(user.householdId)
    ]);

    const memberLookup = new Map(household.members.map((member) => [member.id, member.displayName]));
    const header = [
      "id",
      "title",
      "state",
      "assignee",
      "dueAt",
      "difficulty",
      "basePoints",
      "awardedPoints",
      "requirePhotoProof",
      "attachmentCount",
      "submittedAt",
      "reviewedAt"
    ];

    const rows = instances.map((instance) => [
      instance.id,
      instance.title,
      instance.state,
      instance.assigneeId ? memberLookup.get(instance.assigneeId) ?? "" : "",
      instance.dueAt,
      instance.difficulty,
      String(instance.basePoints),
      String(instance.awardedPoints),
      instance.requirePhotoProof ? "true" : "false",
      String(instance.attachmentCount),
      instance.submittedAt ?? "",
      instance.reviewedAt ?? ""
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(String(value))).join(","))
      .join("\n");
  }

  async exportHouseholdSnapshot(user: AuthenticatedUser) {
    const [household, templates, instances, auditLog, pointsLedger, notificationHealth] =
      await Promise.all([
        this.repository.getHousehold(user.householdId),
        this.repository.getTemplates(user.householdId),
        this.repository.getInstances(user.householdId),
        this.repository.getAuditLog(user.householdId, 500),
        this.repository.getPointsLedger(user.householdId, 500),
        this.repository.getHouseholdNotificationHealth(user.householdId)
      ]);

    return {
      exportVersion: 1,
      exportedAtUtc: new Date().toISOString(),
      household: {
        ...household,
        settings: {
          ...household.settings,
          oidcClientSecret: "",
          smtpPassword: ""
        }
      },
      templates,
      instances,
      auditLog,
      pointsLedger,
      notificationHealth
    };
  }

  getRuntimeLogs(limit = 200) {
    return this.appLogService.getRecentEntries(limit);
  }

  async exportRuntimeLogsText() {
    return this.appLogService.exportText();
  }

  exportRuntimeLogsJson(limit = 1000) {
    return this.appLogService.exportJson(limit);
  }

  async getSystemStatus(user: AuthenticatedUser) {
    const checkedAt = new Date().toISOString();
    const [household, notificationHealth, databaseStatus, storageStatus] = await Promise.all([
      this.repository.getHousehold(user.householdId),
      this.repository.getHouseholdNotificationHealth(user.householdId),
      this.getDatabaseStatus(),
      this.getStorageStatus()
    ]);

    const localAuthForcedByConfig = this.appConfigService.forceLocalAuthEnabled;
    const localAuthEffective = localAuthForcedByConfig || household.settings.localAuthEnabled;
    const oidcSource =
      household.settings.oidcEnabled && household.settings.oidcAuthority && household.settings.oidcClientId
        ? "ui"
        : this.appConfigService.oidcFallbackConfig.enabled
          ? "env"
          : "none";
    const oidcEffective = oidcSource !== "none";
    const authStatus =
      localAuthEffective || oidcEffective
        ? "ready"
        : "error";
    const smtpConfigured = Boolean(
      household.settings.smtpEnabled &&
        household.settings.smtpHost &&
        household.settings.smtpPort &&
        household.settings.smtpFromEmail &&
        (!household.settings.smtpUsername || household.settings.smtpPasswordConfigured)
    );
    const smtpStatus = household.settings.smtpEnabled
      ? smtpConfigured
        ? "ready"
        : "warning"
      : "warning";
    const registeredDeviceCount = notificationHealth.reduce(
      (sum, entry) => sum + entry.registeredDeviceCount,
      0
    );
    const pushReadyDeviceCount = notificationHealth.reduce(
      (sum, entry) => sum + entry.pushReadyDeviceCount,
      0
    );
    const membersWithPushReadyDevices = notificationHealth.filter(
      (entry) => entry.deliveryMode === "push"
    ).length;
    const membersUsingEmailFallback = notificationHealth.filter(
      (entry) => entry.deliveryMode === "email_fallback"
    ).length;
    const membersWithoutDeliveryPath = notificationHealth.filter(
      (entry) => entry.deliveryMode === "none"
    ).length;
    const serviceAccountConfigured = Boolean(this.appConfigService.fcmServiceAccount);
    const webPushConfigured = this.appConfigService.webPushEnabled;
    const pushStatus =
      household.settings.enablePushNotifications &&
      ((this.appConfigService.fcmEnabled && serviceAccountConfigured) || webPushConfigured) &&
      pushReadyDeviceCount > 0
        ? "ready"
        : household.settings.enablePushNotifications
          ? "warning"
          : "warning";
    const emailFallbackStatus =
      smtpConfigured && membersUsingEmailFallback > 0
        ? "ready"
        : "warning";

    return {
      checkedAt,
      application: {
        status: "ready",
        port: this.appConfigService.port,
        serveEmbeddedWeb: this.appConfigService.serveEmbeddedWeb,
        corsAllowedOrigins: this.appConfigService.corsAllowedOrigins,
        reverseProxyEnabled: this.appConfigService.reverseProxyEnabled,
        reverseProxyPathBase: this.appConfigService.reverseProxyPathBase || null
      },
      database: databaseStatus,
      storage: storageStatus,
      auth: {
        status: authStatus,
        localAuthEnabled: household.settings.localAuthEnabled,
        localAuthForcedByConfig,
        localAuthEffective,
        oidcEnabled: household.settings.oidcEnabled,
        oidcEffective,
        oidcSource,
        oidcAuthority:
          oidcSource === "ui"
            ? household.settings.oidcAuthority
            : this.appConfigService.oidcFallbackConfig.authority,
        oidcClientId:
          oidcSource === "ui"
            ? household.settings.oidcClientId
            : this.appConfigService.oidcFallbackConfig.clientId
      },
      smtp: {
        status: smtpStatus,
        enabled: household.settings.smtpEnabled,
        configured: smtpConfigured,
        host: household.settings.smtpHost || null,
        port: household.settings.smtpPort || null,
        secure: household.settings.smtpSecure,
        fromEmail: household.settings.smtpFromEmail || null
      },
      push: {
        status: pushStatus,
        householdPushEnabled: household.settings.enablePushNotifications,
        serverFcmEnabled: this.appConfigService.fcmEnabled,
        serviceAccountConfigured,
        serverWebPushEnabled: webPushConfigured,
        registeredDeviceCount,
        pushReadyDeviceCount,
        membersWithPushReadyDevices,
        membersUsingEmailFallback,
        membersWithoutDeliveryPath,
        deliveryWorkerIntervalMs: this.appConfigService.pushDeliveryIntervalMs
      },
      emailFallback: {
        status: emailFallbackStatus,
        smtpReady: smtpConfigured,
        eligibleMemberCount: notificationHealth.filter((entry) => entry.emailFallbackEligible).length,
        activeFallbackMemberCount: membersUsingEmailFallback,
        workerIntervalMs: this.appConfigService.emailDeliveryIntervalMs
      }
    };
  }

  async getBackupReadiness(user: AuthenticatedUser) {
    const checkedAt = new Date().toISOString();
    const household = await this.repository.getHousehold(user.householdId);
    const dataRootHint = this.appConfigService.dataRootHint || null;
    const postgresDataPathHint = dataRootHint ? path.posix.join(dataRootHint, "postgres") : null;
    const appDataPathHint = dataRootHint ? path.posix.join(dataRootHint, "taskbandit") : null;
    const oidcUiConfigured = Boolean(
      household.settings.oidcEnabled &&
        household.settings.oidcAuthority &&
        household.settings.oidcClientId
    );
    const smtpConfigured = Boolean(
      household.settings.smtpEnabled &&
        household.settings.smtpHost &&
        household.settings.smtpPort &&
        household.settings.smtpFromEmail &&
        (!household.settings.smtpUsername || household.settings.smtpPasswordConfigured)
    );

    return {
      checkedAt,
      hostPaths: {
        dataRootHint,
        postgresDataPathHint,
        appDataPathHint,
        composeFileHint: this.appConfigService.composeFileHint || null,
        envFileHint: this.appConfigService.envFileHint || null
      },
      serverPaths: {
        storageRootPath: this.appConfigService.storageRootPath,
        runtimeLogFilePath: this.appConfigService.runtimeLogFilePath
      },
      exports: {
        householdSnapshotReady: true,
        runtimeLogsReady: true
      },
      recovery: {
        localAuthForcedByConfig: this.appConfigService.forceLocalAuthEnabled,
        oidcUiConfigured,
        oidcEnvFallbackEnabled: this.appConfigService.oidcFallbackConfig.enabled,
        smtpConfigured,
        pushConfigured: this.appConfigService.fcmEnabled
      }
    };
  }

  private escapeCsv(value: string) {
    const normalized = value.replace(/"/g, '""');
    return `"${normalized}"`;
  }

  private async getDatabaseStatus() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ready" as const,
        error: null
      };
    } catch (error) {
      return {
        status: "error" as const,
        error: error instanceof Error ? error.message : "Database connection failed."
      };
    }
  }

  private async getStorageStatus() {
    const rootPath = this.appConfigService.storageRootPath;
    const runtimeLogFilePath = this.appConfigService.runtimeLogFilePath;

    try {
      await mkdir(rootPath, { recursive: true });
      await mkdir(path.dirname(runtimeLogFilePath), { recursive: true });
      await Promise.all([
        access(rootPath, constants.R_OK | constants.W_OK),
        access(path.dirname(runtimeLogFilePath), constants.R_OK | constants.W_OK)
      ]);

      return {
        status: "ready" as const,
        rootPath,
        runtimeLogFilePath,
        error: null
      };
    } catch (error) {
      return {
        status: "error" as const,
        rootPath,
        runtimeLogFilePath,
        error: error instanceof Error ? error.message : "Storage path is not writable."
      };
    }
  }
}
