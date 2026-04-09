import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AuthProvider,
  AssignmentStrategyType,
  ChoreAttachment,
  ChoreChecklistCompletion,
  ChoreTakeoverRequestStatus,
  ChoreState,
  Difficulty,
  FollowUpDelayUnit,
  HouseholdRole,
  NotificationEmailDeliveryStatus,
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationPushDeliveryStatus,
  NotificationType,
  RecurrenceStartStrategy,
  RecurrenceType,
  Prisma
} from "@prisma/client";
import { hash } from "bcryptjs";
import {
  fallbackLanguage,
  supportedLanguages,
  SupportedLanguage
} from "../../common/i18n/supported-languages";
import { AppLogService } from "../../common/logging/app-log.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateChoreInstanceDto } from "../chores/dto/create-chore-instance.dto";
import { SubmitAttachmentDto } from "../chores/dto/submit-chore.dto";
import { CreateChoreTemplateDto } from "../chores/dto/create-chore-template.dto";
import { CreateHouseholdMemberDto } from "../settings/dto/create-household-member.dto";
import { RegisterNotificationDeviceDto } from "../settings/dto/register-notification-device.dto";
import { UpdateNotificationPreferencesDto } from "../settings/dto/update-notification-preferences.dto";
import { UpdateHouseholdMemberDto } from "../settings/dto/update-household-member.dto";
import { UpdateSettingsDto } from "../settings/dto/update-settings.dto";

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type LocalizedTemplateTranslationInput = NonNullable<CreateChoreTemplateDto["translations"]>[number];
type LocalizedVariantTranslationInput = NonNullable<
  NonNullable<CreateChoreTemplateDto["variants"]>[number]["translations"]
>[number];
type LocalizedTextMap = Partial<Record<SupportedLanguage, string>>;

@Injectable()
export class HouseholdRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appLogService: AppLogService
  ) {}

  async getBootstrapStatus() {
    const householdCount = await this.prisma.household.count();
    return {
      isBootstrapped: householdCount > 0,
      householdCount
    };
  }

  async bootstrapHousehold(
    householdName: string,
    ownerDisplayName: string,
    ownerEmail: string,
    ownerPasswordHash: string,
    selfSignupEnabled: boolean
  ) {
    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const household = await this.prisma.household.create({
      data: {
        name: householdName.trim(),
        settings: {
          create: {
            selfSignupEnabled,
            onboardingCompleted: false,
            membersCanSeeFullHouseholdChoreDetails: true,
            enablePushNotifications: true,
            enableOverduePenalties: true,
            localAuthEnabled: true,
            oidcEnabled: false,
            oidcScope: "openid profile email",
            smtpEnabled: false,
            smtpSecure: false
          }
        },
        members: {
          create: {
            displayName: ownerDisplayName.trim(),
            role: HouseholdRole.ADMIN,
            points: 0,
            currentStreak: 0,
            identities: {
              create: {
                provider: AuthProvider.LOCAL,
                providerSubject: normalizedEmail,
                email: normalizedEmail,
                passwordHash: ownerPasswordHash
              }
            }
          }
        }
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: true
          }
        }
      }
    });

    return this.mapHousehold(household);
  }

  async getHousehold(householdId: string) {
    const household = await this.prisma.household.findFirstOrThrow({
      where: {
        id: householdId
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: true
          }
        }
      }
    });

    return this.mapHousehold(household);
  }

  async getHouseholdForViewer(
    householdId: string,
    viewerRole: "admin" | "parent" | "child"
  ) {
    const household = await this.prisma.household.findFirstOrThrow({
      where: {
        id: householdId
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: true
          }
        }
      }
    });

    return this.mapHousehold(household, {
      redactMemberEmails: viewerRole === "child"
    });
  }

  async updateSettings(dto: UpdateSettingsDto, householdId: string, actorUserId?: string) {
    const household = await this.prisma.household.findFirstOrThrow({
      where: {
        id: householdId
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: {
              where: {
                provider: AuthProvider.LOCAL
              },
              take: 1
            }
          }
        }
      }
    });

    await this.prisma.householdSettings.update({
      where: {
        householdId: household.id
      },
      data: {
        selfSignupEnabled: dto.selfSignupEnabled ?? household.settings?.selfSignupEnabled,
        onboardingCompleted: dto.onboardingCompleted ?? household.settings?.onboardingCompleted ?? false,
        membersCanSeeFullHouseholdChoreDetails:
          dto.membersCanSeeFullHouseholdChoreDetails ??
          household.settings?.membersCanSeeFullHouseholdChoreDetails,
        enablePushNotifications:
          dto.enablePushNotifications ?? household.settings?.enablePushNotifications,
        enableOverduePenalties:
          dto.enableOverduePenalties ?? household.settings?.enableOverduePenalties,
        localAuthEnabled: dto.localAuthEnabled ?? household.settings?.localAuthEnabled ?? true,
        oidcEnabled: dto.oidcEnabled ?? household.settings?.oidcEnabled ?? false,
        oidcAuthority:
          dto.oidcAuthority !== undefined
            ? dto.oidcAuthority.trim() || null
            : household.settings?.oidcAuthority ?? null,
        oidcClientId:
          dto.oidcClientId !== undefined
            ? dto.oidcClientId.trim() || null
            : household.settings?.oidcClientId ?? null,
        oidcClientSecret:
          dto.oidcClientSecret !== undefined
            ? dto.oidcClientSecret.trim() || null
            : household.settings?.oidcClientSecret ?? null,
        oidcScope:
          dto.oidcScope !== undefined
            ? dto.oidcScope.trim() || "openid profile email"
            : household.settings?.oidcScope ?? "openid profile email",
        smtpEnabled: dto.smtpEnabled ?? household.settings?.smtpEnabled ?? false,
        smtpHost:
          dto.smtpHost !== undefined ? dto.smtpHost.trim() || null : household.settings?.smtpHost ?? null,
        smtpPort: dto.smtpPort ?? household.settings?.smtpPort ?? null,
        smtpSecure: dto.smtpSecure ?? household.settings?.smtpSecure ?? false,
        smtpUsername:
          dto.smtpUsername !== undefined
            ? dto.smtpUsername.trim() || null
            : household.settings?.smtpUsername ?? null,
        smtpPassword:
          dto.smtpPassword !== undefined
            ? dto.smtpPassword.trim() || null
            : household.settings?.smtpPassword ?? null,
        smtpFromEmail:
          dto.smtpFromEmail !== undefined
            ? dto.smtpFromEmail.trim() || null
            : household.settings?.smtpFromEmail ?? null,
        smtpFromName:
          dto.smtpFromName !== undefined
            ? dto.smtpFromName.trim() || null
            : household.settings?.smtpFromName ?? null
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "household.settings.updated",
      entityType: "household_settings",
      entityId: household.id,
      summary: "Updated household settings."
    });

    return this.getHousehold(householdId);
  }

  async getAuditLog(householdId: string, take = 25) {
    const auditLog = await this.prisma.auditLog.findMany({
      where: {
        householdId
      },
      include: {
        actor: true
      },
      orderBy: {
        createdAtUtc: "desc"
      },
      take
    });

    return auditLog.map((entry) => this.mapAuditLog(entry));
  }

  async getPointsLedger(householdId: string, take = 25) {
    const pointsLedger = await this.prisma.pointsLedgerEntry.findMany({
      where: {
        householdId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAtUtc: "desc"
      },
      take
    });

    return pointsLedger.map((entry) => this.mapPointsLedgerEntry(entry));
  }

  async getNotificationPreferences(householdId: string, userId: string) {
    await this.ensureUserBelongsToHousehold(householdId, userId);
    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId
      }
    });

    return this.mapNotificationPreference(preference);
  }

  async updateNotificationPreferences(
    dto: UpdateNotificationPreferencesDto,
    householdId: string,
    userId: string
  ) {
    await this.ensureUserBelongsToHousehold(householdId, userId);
    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        userId
      },
      update: {
        receiveAssignments: dto.receiveAssignments,
        receiveReviewUpdates: dto.receiveReviewUpdates,
        receiveDueSoonReminders: dto.receiveDueSoonReminders,
        receiveOverdueAlerts: dto.receiveOverdueAlerts,
        receiveDailySummary: dto.receiveDailySummary
      },
      create: {
        userId,
        receiveAssignments: dto.receiveAssignments ?? true,
        receiveReviewUpdates: dto.receiveReviewUpdates ?? true,
        receiveDueSoonReminders: dto.receiveDueSoonReminders ?? true,
        receiveOverdueAlerts: dto.receiveOverdueAlerts ?? true,
        receiveDailySummary: dto.receiveDailySummary ?? true
      }
    });

    return this.mapNotificationPreference(preference);
  }

  async getNotificationDevices(householdId: string, userId: string) {
    await this.ensureUserBelongsToHousehold(householdId, userId);
    const devices = await this.prisma.notificationDevice.findMany({
      where: {
        userId
      },
      orderBy: {
        updatedAtUtc: "desc"
      }
    });

    return devices.map((device) => this.mapNotificationDevice(device));
  }

  async getHouseholdNotificationHealth(householdId: string) {
    const [householdSettings, members] = await Promise.all([
      this.prisma.householdSettings.findUnique({
        where: {
          householdId
        }
      }),
      this.prisma.user.findMany({
        where: {
          householdId
        },
        include: {
          identities: {
            where: {
              email: {
                not: null
              }
            },
            orderBy: {
              createdAtUtc: "asc"
            }
          },
          notificationDevices: {
            orderBy: {
              updatedAtUtc: "desc"
            }
          }
        },
        orderBy: {
          displayName: "asc"
        }
      })
    ]);

    const smtpFallbackAvailable = Boolean(
      householdSettings?.smtpEnabled &&
        householdSettings.smtpHost &&
        householdSettings.smtpPort &&
        householdSettings.smtpFromEmail
    );

    return members.map((member) => {
      const registeredDeviceCount = member.notificationDevices.length;
      const pushReadyDeviceCount = member.notificationDevices.filter(
        (device) =>
          device.notificationsEnabled &&
          Boolean(device.pushToken) &&
          device.provider === NotificationDeviceProvider.FCM
      ).length;
      const fallbackEmail = member.identities.find((identity) => Boolean(identity.email))?.email ?? null;
      const emailFallbackEligible = smtpFallbackAvailable && Boolean(fallbackEmail);
      const latestDeviceSeenAt = member.notificationDevices[0]?.lastSeenAtUtc ?? null;
      const deliveryMode =
        pushReadyDeviceCount > 0 ? "push" : emailFallbackEligible ? "email_fallback" : "none";

      return {
        userId: member.id,
        displayName: member.displayName,
        role: member.role.toLowerCase(),
        email: fallbackEmail,
        registeredDeviceCount,
        pushReadyDeviceCount,
        latestDeviceSeenAt,
        emailFallbackEligible,
        deliveryMode
      };
    });
  }

  async registerNotificationDevice(
    dto: RegisterNotificationDeviceDto,
    householdId: string,
    userId: string
  ) {
    await this.ensureUserBelongsToHousehold(householdId, userId);
    const installationId = dto.installationId.trim();
    const platform = this.mapNotificationDevicePlatform(dto.platform);
    const provider = this.mapNotificationDeviceProvider(dto.provider);
    const notificationDevice = await this.prisma.notificationDevice.upsert({
      where: {
        installationId
      },
      update: {
        userId,
        platform,
        provider,
        pushToken: dto.pushToken?.trim() || null,
        deviceName: dto.deviceName?.trim() || null,
        appVersion: dto.appVersion?.trim() || null,
        locale: dto.locale?.trim() || null,
        notificationsEnabled: dto.notificationsEnabled ?? true,
        lastSeenAtUtc: new Date()
      },
      create: {
        userId,
        installationId,
        platform,
        provider,
        pushToken: dto.pushToken?.trim() || null,
        deviceName: dto.deviceName?.trim() || null,
        appVersion: dto.appVersion?.trim() || null,
        locale: dto.locale?.trim() || null,
        notificationsEnabled: dto.notificationsEnabled ?? true,
        lastSeenAtUtc: new Date()
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId: userId,
      action: "notification.device.registered",
      entityType: "notification_device",
      entityId: notificationDevice.id,
      summary: `Registered ${platform.toLowerCase()} notification device "${notificationDevice.deviceName ?? installationId}".`
    });

    return this.mapNotificationDevice(notificationDevice);
  }

  async deleteNotificationDevice(deviceId: string, householdId: string, userId: string) {
    const existingDevice = await this.prisma.notificationDevice.findFirst({
      where: {
        id: deviceId,
        userId,
        user: {
          householdId
        }
      }
    });

    if (!existingDevice) {
      throw new NotFoundException({
        message: "That notification device could not be found."
      });
    }

    await this.prisma.notificationDevice.delete({
      where: {
        id: deviceId
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId: userId,
      action: "notification.device.deleted",
      entityType: "notification_device",
      entityId: deviceId,
      summary: `Removed notification device "${existingDevice.deviceName ?? existingDevice.installationId}".`
    });

    return this.getNotificationDevices(householdId, userId);
  }

  async hasDeliverablePushDevice(recipientUserId: string) {
    const count = await this.prisma.notificationDevice.count({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId)
    });

    return count > 0;
  }

  async createAdminTestNotification(input: {
    householdId: string;
    actorUserId: string;
    actorDisplayName: string;
    recipientUserId: string;
  }) {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: input.recipientUserId,
        householdId: input.householdId
      },
      select: {
        id: true,
        displayName: true
      }
    });

    if (!recipient) {
      throw new NotFoundException({
        message: "That household member could not be found."
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.recordNotification(tx, {
        householdId: input.householdId,
        recipientUserId: recipient.id,
        type: NotificationType.CHORE_DUE_SOON,
        title: "TaskBandit test notification",
        message: `This is a delivery test from ${input.actorDisplayName}. If this reached you, your current notification path is working.`,
        entityType: "notification_test",
        entityId: input.actorUserId
      });

      await this.recordAuditLog(tx, {
        householdId: input.householdId,
        actorUserId: input.actorUserId,
        action: "notification.test_sent",
        entityType: "notification_test",
        entityId: recipient.id,
        summary: `Sent a test notification to ${recipient.displayName}.`
      });
    });

    return {
      recipientUserId: recipient.id,
      recipientDisplayName: recipient.displayName
    };
  }

  async getPendingPushDeliveries(take = 25) {
    const deliveries = await this.prisma.notificationPushDelivery.findMany({
      where: {
        status: NotificationPushDeliveryStatus.PENDING
      },
      include: {
        notification: true,
        notificationDevice: true
      },
      orderBy: {
        createdAtUtc: "asc"
      },
      take
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      notificationId: delivery.notificationId,
      notificationDeviceId: delivery.notificationDeviceId,
      title: delivery.notification.title,
      message: delivery.notification.message,
      entityType: delivery.notification.entityType,
      entityId: delivery.notification.entityId,
      provider: delivery.notificationDevice.provider,
      pushToken: delivery.notificationDevice.pushToken,
      deviceName: delivery.notificationDevice.deviceName
    }));
  }

  async getNotificationRecovery(householdId: string, take = 50) {
    const [failedPushDeliveries, failedEmailNotifications] = await Promise.all([
      this.prisma.notificationPushDelivery.findMany({
        where: {
          status: NotificationPushDeliveryStatus.FAILED,
          notification: {
            householdId
          }
        },
        include: {
          notification: {
            include: {
              recipient: true
            }
          },
          notificationDevice: true
        },
        orderBy: {
          updatedAtUtc: "desc"
        },
        take
      }),
      this.prisma.notification.findMany({
        where: {
          householdId,
          emailDeliveryStatus: NotificationEmailDeliveryStatus.FAILED
        },
        include: {
          recipient: {
            include: {
              identities: {
                where: {
                  email: {
                    not: null
                  }
                },
                orderBy: {
                  createdAtUtc: "asc"
                }
              }
            }
          }
        },
        orderBy: {
          emailLastAttemptedAtUtc: "desc"
        },
        take
      })
    ]);

    return {
      failedPushDeliveries: failedPushDeliveries.map((delivery) => ({
        id: delivery.id,
        notificationId: delivery.notificationId,
        title: delivery.notification.title,
        message: delivery.notification.message,
        recipientDisplayName: delivery.notification.recipient.displayName,
        deviceName: delivery.notificationDevice.deviceName,
        provider: delivery.notificationDevice.provider.toLowerCase(),
        attemptedAt: delivery.attemptedAtUtc,
        error: delivery.errorMessage,
        createdAt: delivery.createdAtUtc
      })),
      failedEmailNotifications: failedEmailNotifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        recipientDisplayName: notification.recipient.displayName,
        recipientEmail:
          notification.recipient.identities.find((identity) => Boolean(identity.email))?.email ?? null,
        attemptedAt: notification.emailLastAttemptedAtUtc,
        error: notification.emailDeliveryError,
        createdAt: notification.createdAtUtc
      }))
    };
  }

  async markPushDeliverySent(deliveryId: string, providerMessageId?: string | null) {
    await this.prisma.notificationPushDelivery.update({
      where: {
        id: deliveryId
      },
      data: {
        status: NotificationPushDeliveryStatus.SENT,
        providerMessageId: providerMessageId ?? null,
        errorMessage: null,
        attemptedAtUtc: new Date()
      }
    });
  }

  async markPushDeliveryFailed(deliveryId: string, errorMessage: string) {
    await this.prisma.notificationPushDelivery.update({
      where: {
        id: deliveryId
      },
      data: {
        status: NotificationPushDeliveryStatus.FAILED,
        errorMessage,
        attemptedAtUtc: new Date()
      }
    });
  }

  async retryFailedPushDelivery(householdId: string, actorUserId: string, deliveryId: string) {
    const existingDelivery = await this.prisma.notificationPushDelivery.findFirst({
      where: {
        id: deliveryId,
        status: NotificationPushDeliveryStatus.FAILED,
        notification: {
          householdId
        }
      },
      include: {
        notification: {
          include: {
            recipient: true
          }
        },
        notificationDevice: true
      }
    });

    if (!existingDelivery) {
      throw new NotFoundException({
        message: "That failed push delivery could not be found."
      });
    }

    await this.prisma.notificationPushDelivery.update({
      where: {
        id: deliveryId
      },
      data: {
        status: NotificationPushDeliveryStatus.PENDING,
        errorMessage: null,
        providerMessageId: null,
        attemptedAtUtc: null
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "notification.push_delivery.retried",
      entityType: "notification_push_delivery",
      entityId: deliveryId,
      summary: `Retried failed push delivery for ${existingDelivery.notification.recipient.displayName} on ${existingDelivery.notificationDevice.deviceName ?? existingDelivery.notificationDevice.installationId}.`
    });
  }

  async getPendingEmailNotifications(take = 25) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.PENDING
      },
      include: {
        household: {
          include: {
            settings: true
          }
        },
        recipient: {
          include: {
            identities: {
              where: {
                email: {
                  not: null
                }
              },
              orderBy: {
                createdAtUtc: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        createdAtUtc: "asc"
      },
      take
    });

    return notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      householdId: notification.householdId,
      recipientUserId: notification.recipientUserId,
      recipientEmail:
        notification.recipient.identities.find((identity) => Boolean(identity.email))?.email ?? null,
      smtpSettings: {
        enabled: notification.household.settings?.smtpEnabled ?? false,
        host: notification.household.settings?.smtpHost ?? "",
        port: notification.household.settings?.smtpPort ?? 0,
        secure: notification.household.settings?.smtpSecure ?? false,
        username: notification.household.settings?.smtpUsername ?? "",
        password: notification.household.settings?.smtpPassword ?? "",
        fromEmail: notification.household.settings?.smtpFromEmail ?? "",
        fromName: notification.household.settings?.smtpFromName ?? "",
        passwordConfigured: Boolean(notification.household.settings?.smtpPassword)
      }
    }));
  }

  async markNotificationEmailSent(notificationId: string) {
    await this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.SENT,
        emailDeliveryError: null,
        emailDeliveredAtUtc: new Date(),
        emailLastAttemptedAtUtc: new Date()
      }
    });
  }

  async markNotificationEmailFailed(notificationId: string, errorMessage: string) {
    await this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.FAILED,
        emailDeliveryError: errorMessage,
        emailLastAttemptedAtUtc: new Date()
      }
    });
  }

  async markNotificationEmailSkipped(notificationId: string, reason: string) {
    await this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.SKIPPED,
        emailDeliveryError: reason,
        emailLastAttemptedAtUtc: new Date()
      }
    });
  }

  async retryFailedEmailDelivery(householdId: string, actorUserId: string, notificationId: string) {
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        householdId,
        emailDeliveryStatus: NotificationEmailDeliveryStatus.FAILED
      },
      include: {
        recipient: true
      }
    });

    if (!existingNotification) {
      throw new NotFoundException({
        message: "That failed email fallback could not be found."
      });
    }

    await this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.PENDING,
        emailDeliveryError: null,
        emailLastAttemptedAtUtc: null,
        emailDeliveredAtUtc: null
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "notification.email_delivery.retried",
      entityType: "notification",
      entityId: notificationId,
      summary: `Retried failed email fallback for ${existingNotification.recipient.displayName}.`
    });
  }

  async getNotifications(householdId: string, recipientUserId: string, take = 25) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        householdId,
        recipientUserId
      },
      include: {
        pushDeliveries: true
      },
      orderBy: {
        createdAtUtc: "desc"
      },
      take
    });

    return notifications.map((entry) => this.mapNotification(entry));
  }

  async markNotificationRead(notificationId: string, householdId: string, recipientUserId: string) {
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        householdId,
        recipientUserId
      }
    });

    if (!existingNotification) {
      throw new NotFoundException({
        message: "That notification could not be found."
      });
    }

    await this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true,
        readAtUtc: new Date()
      }
    });

    return this.getNotifications(householdId, recipientUserId);
  }

  async markAllNotificationsRead(householdId: string, recipientUserId: string) {
    await this.prisma.notification.updateMany({
      where: {
        householdId,
        recipientUserId,
        isRead: false
      },
      data: {
        isRead: true,
        readAtUtc: new Date()
      }
    });

    return this.getNotifications(householdId, recipientUserId);
  }

  async processReminderNotifications(options: {
    now: Date;
    dueSoonWindowHours: number;
  }) {
    const activeHouseholds = await this.prisma.householdSettings.findMany({
      where: {
        enablePushNotifications: true
      },
      select: {
        householdId: true
      }
    });

    if (activeHouseholds.length === 0) {
      return {
        createdCount: 0
      };
    }

    const dueSoonThreshold = new Date(
      options.now.getTime() + Math.max(options.dueSoonWindowHours, 1) * 60 * 60 * 1000
    );

    const candidateInstances = await this.prisma.choreInstance.findMany({
      where: {
        householdId: {
          in: activeHouseholds.map((household) => household.householdId)
        },
        assigneeId: {
          not: null
        },
        state: {
          in: [
            ChoreState.OPEN,
            ChoreState.ASSIGNED,
            ChoreState.IN_PROGRESS,
            ChoreState.NEEDS_FIXES,
            ChoreState.OVERDUE
          ]
        },
        dueAtUtc: {
          lte: dueSoonThreshold
        }
      },
      select: {
        id: true,
        householdId: true,
        title: true,
        assigneeId: true,
        dueAtUtc: true,
        state: true
      }
    });

    let createdCount = 0;

    for (const instance of candidateInstances) {
      if (!instance.assigneeId) {
        continue;
      }

      const type =
        instance.dueAtUtc.getTime() <= options.now.getTime()
          ? NotificationType.CHORE_OVERDUE
          : NotificationType.CHORE_DUE_SOON;

      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          householdId: instance.householdId,
          recipientUserId: instance.assigneeId,
          entityType: "chore_instance",
          entityId: instance.id,
          type
        },
        select: {
          id: true
        }
      });

      if (existingNotification) {
        continue;
      }

      const createdNotification = await this.recordNotification(this.prisma, {
        householdId: instance.householdId,
        recipientUserId: instance.assigneeId,
        type,
        title: type === NotificationType.CHORE_OVERDUE ? "Chore overdue" : "Chore due soon",
        message:
          type === NotificationType.CHORE_OVERDUE
            ? `"${instance.title}" is overdue. Jump back in before more points slip away.`
            : `"${instance.title}" is due soon. Time for the raccoon crew to make a move.`,
        entityType: "chore_instance",
        entityId: instance.id
      });

      if (createdNotification) {
        createdCount += 1;
      }
    }

    return {
      createdCount
    };
  }

  async processDailySummaryNotifications(options: {
    now: Date;
    summaryHourUtc: number;
    force?: boolean;
  }) {
    if (!options.force && options.now.getUTCHours() !== options.summaryHourUtc) {
      return {
        createdCount: 0
      };
    }

    const activeHouseholds = await this.prisma.householdSettings.findMany({
      where: {
        enablePushNotifications: true
      },
      select: {
        householdId: true
      }
    });

    if (activeHouseholds.length === 0) {
      return {
        createdCount: 0
      };
    }

    const householdIds = activeHouseholds.map((household) => household.householdId);
    const [members, instances] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          householdId: {
            in: householdIds
          }
        },
        select: {
          id: true,
          householdId: true,
          role: true
        }
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId: {
            in: householdIds
          }
        },
        select: {
          householdId: true,
          assigneeId: true,
          dueAtUtc: true,
          state: true
        }
      })
    ]);

    const startOfDayUtc = new Date(options.now);
    startOfDayUtc.setUTCHours(0, 0, 0, 0);
    const endOfDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000);

    let createdCount = 0;

    for (const member of members) {
      const existingSummary = await this.prisma.notification.findFirst({
        where: {
          householdId: member.householdId,
          recipientUserId: member.id,
          type: NotificationType.DAILY_SUMMARY,
          createdAtUtc: {
            gte: startOfDayUtc,
            lt: endOfDayUtc
          }
        },
        select: {
          id: true
        }
      });

      if (existingSummary) {
        continue;
      }

      const assignedInstances = instances.filter((instance) => instance.assigneeId === member.id);
      const dueTodayCount = assignedInstances.filter(
        (instance) =>
          instance.dueAtUtc >= startOfDayUtc &&
          instance.dueAtUtc < endOfDayUtc &&
          instance.state !== ChoreState.COMPLETED &&
          instance.state !== ChoreState.CANCELLED
      ).length;
      const overdueCount = assignedInstances.filter(
        (instance) =>
          instance.dueAtUtc < options.now &&
          instance.state !== ChoreState.COMPLETED &&
          instance.state !== ChoreState.CANCELLED
      ).length;
      const approvalCount =
        member.role === HouseholdRole.ADMIN || member.role === HouseholdRole.PARENT
          ? instances.filter(
              (instance) =>
                instance.householdId === member.householdId &&
                instance.state === ChoreState.PENDING_APPROVAL
            ).length
          : 0;

      if (dueTodayCount === 0 && overdueCount === 0 && approvalCount === 0) {
        continue;
      }

      const createdNotification = await this.recordNotification(this.prisma, {
        householdId: member.householdId,
        recipientUserId: member.id,
        type: NotificationType.DAILY_SUMMARY,
        title: "Daily TaskBandit summary",
        message: this.buildDailySummaryMessage(dueTodayCount, overdueCount, approvalCount),
        entityType: "daily_summary",
        entityId: startOfDayUtc.toISOString().slice(0, 10)
      });

      if (createdNotification) {
        createdCount += 1;
      }
    }

    return {
      createdCount
    };
  }

  async processOverduePenalties(householdId: string, actorUserId?: string) {
    const householdSettings = await this.prisma.householdSettings.findUnique({
      where: {
        householdId
      }
    });

    if (!householdSettings?.enableOverduePenalties) {
      return {
        processedCount: 0,
        totalPenaltyPoints: 0
      };
    }

    const overdueInstances = await this.prisma.choreInstance.findMany({
      where: {
        householdId,
        overduePenaltyAppliedAtUtc: null,
        dueAtUtc: {
          lt: new Date()
        },
        state: {
          in: [ChoreState.OPEN, ChoreState.ASSIGNED, ChoreState.IN_PROGRESS, ChoreState.NEEDS_FIXES]
        }
      },
      include: {
        template: true
      }
    });

    let processedCount = 0;
    let totalPenaltyPoints = 0;

    for (const instance of overdueInstances) {
      const beneficiaryUserId = instance.assigneeId;
      const basePenaltyPoints = this.getBasePoints(instance.template.difficulty);
      const penaltyPoints = Math.ceil(basePenaltyPoints * 0.3);

      await this.prisma.$transaction(async (tx) => {
        let appliedPenaltyPoints = penaltyPoints;

        if (beneficiaryUserId) {
          const user = await tx.user.findUniqueOrThrow({
            where: {
              id: beneficiaryUserId
            }
          });

          appliedPenaltyPoints = Math.min(user.points, penaltyPoints);

          await tx.user.update({
            where: {
              id: beneficiaryUserId
            },
            data: {
              points: {
                decrement: appliedPenaltyPoints
              }
            }
          });

          await this.recordPointsLedgerEntry(tx, {
            householdId,
            userId: beneficiaryUserId,
            choreInstanceId: instance.id,
            amount: -appliedPenaltyPoints,
            reason: `Overdue penalty for "${instance.title}".`
          });
        }

        await tx.choreInstance.update({
          where: {
            id: instance.id
          },
          data: {
            state: ChoreState.OVERDUE,
            overduePenaltyPoints: appliedPenaltyPoints,
            overduePenaltyAppliedAtUtc: new Date()
          }
        });

        await this.recordAuditLog(tx, {
          householdId,
          actorUserId,
          action: "instance.overdue_penalty_applied",
          entityType: "chore_instance",
          entityId: instance.id,
          summary: `Applied overdue penalty to "${instance.title}".`
        });

        if (beneficiaryUserId) {
          await this.recordNotification(tx, {
            householdId,
            recipientUserId: beneficiaryUserId,
            type: NotificationType.OVERDUE_PENALTY,
            title: "Overdue penalty applied",
            message:
              appliedPenaltyPoints > 0
                ? `"${instance.title}" is overdue. ${appliedPenaltyPoints} points were deducted from your balance.`
                : `"${instance.title}" is overdue. Your balance was already at zero, so no additional points were deducted.`,
            entityType: "chore_instance",
            entityId: instance.id
          });
        }

        processedCount += 1;
        totalPenaltyPoints += appliedPenaltyPoints;
      });
    }

    return {
      processedCount,
      totalPenaltyPoints
    };
  }

  async createHouseholdMember(
    dto: CreateHouseholdMemberDto,
    householdId: string,
    passwordHash: string,
    emailInUseMessage: string,
    actorUserId?: string
  ): Promise<{
    household: Awaited<ReturnType<HouseholdRepository["getHousehold"]>>;
    createdMember: {
      id: string;
      displayName: string;
      role: "parent" | "child";
      email: string;
    } | null;
  }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingIdentity) {
      throw new ConflictException({
        message: emailInUseMessage
      });
    }

    let createdMember: {
      id: string;
      displayName: string;
      role: "parent" | "child";
      email: string;
    } | null = null;

    await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          householdId,
          displayName: dto.displayName.trim(),
          role: dto.role === "child" ? HouseholdRole.CHILD : HouseholdRole.PARENT,
          identities: {
            create: {
              provider: AuthProvider.LOCAL,
              providerSubject: normalizedEmail,
              email: normalizedEmail,
              passwordHash
            }
          }
        }
      });

      createdMember = {
        id: createdUser.id,
        displayName: dto.displayName.trim(),
        role: dto.role,
        email: normalizedEmail
      };

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "member.created",
        entityType: "household_member",
        entityId: createdUser.id,
        summary: `Created ${dto.role} account for ${dto.displayName.trim()}.`
      });
    });

    return {
      household: await this.getHousehold(householdId),
      createdMember
    };
  }

  async updateHouseholdMember(
    memberId: string,
    dto: UpdateHouseholdMemberDto,
    householdId: string,
    emailInUseMessage: string,
    actorUserId?: string,
    passwordHash?: string
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingMember = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        householdId
      },
      include: {
        identities: {
          where: {
            OR: [
              {
                provider: AuthProvider.LOCAL
              },
              {
                email: {
                  not: null
                }
              }
            ]
          },
          orderBy: {
            createdAtUtc: "asc"
          }
        }
      }
    });

    if (!existingMember) {
      throw new NotFoundException({
        message: "That household member could not be found."
      });
    }

    const localIdentity =
      existingMember.identities.find((identity) => identity.provider === AuthProvider.LOCAL) ?? null;
    const primaryEmailIdentity =
      localIdentity ?? existingMember.identities.find((identity) => Boolean(identity.email)) ?? null;

    const emailAlreadyInUse = await this.prisma.authIdentity.findFirst({
      where: {
        email: normalizedEmail,
        userId: {
          not: existingMember.id
        }
      },
      select: {
        id: true
      }
    });

    if (emailAlreadyInUse) {
      throw new ConflictException({
        message: emailInUseMessage
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const nextRole =
        existingMember.role === HouseholdRole.ADMIN
          ? HouseholdRole.ADMIN
          : dto.role === "child"
            ? HouseholdRole.CHILD
            : HouseholdRole.PARENT;

      await tx.user.update({
        where: {
          id: existingMember.id
        },
        data: {
          displayName: dto.displayName.trim(),
          role: nextRole
        }
      });

      if (localIdentity) {
        await tx.authIdentity.update({
          where: {
            id: localIdentity.id
          },
          data: {
            providerSubject: normalizedEmail,
            email: normalizedEmail,
            passwordHash: passwordHash ?? localIdentity.passwordHash
          }
        });

        if (passwordHash) {
          await tx.passwordResetToken.updateMany({
            where: {
              authIdentityId: localIdentity.id,
              usedAtUtc: null
            },
            data: {
              usedAtUtc: new Date()
            }
          });
        }
      } else if (passwordHash) {
        await tx.authIdentity.create({
          data: {
            userId: existingMember.id,
            provider: AuthProvider.LOCAL,
            providerSubject: normalizedEmail,
            email: normalizedEmail,
            passwordHash
          }
        });
      } else if (primaryEmailIdentity) {
        await tx.authIdentity.update({
          where: {
            id: primaryEmailIdentity.id
          },
          data: {
            email: normalizedEmail
          }
        });
      }

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "member.updated",
        entityType: "household_member",
        entityId: existingMember.id,
        summary:
          existingMember.role === HouseholdRole.ADMIN
            ? `Updated household owner profile for ${dto.displayName.trim()}.`
            : `Updated ${dto.role} account for ${dto.displayName.trim()}.`
      });
    });

    return this.getHousehold(householdId);
  }

  async getDashboardSummary(householdId: string) {
    const [household, instances] = await Promise.all([
      this.prisma.household.findFirstOrThrow({
        where: {
          id: householdId
        },
        include: {
          members: {
            include: {
              identities: {
                where: {
                  provider: AuthProvider.LOCAL
                },
                take: 1
              }
            }
          }
        }
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId
        }
      })
    ]);

    const pendingApprovals = instances.filter((instance) => instance.state === ChoreState.PENDING_APPROVAL).length;
    const activeChores = instances.filter(
      (instance) =>
        instance.state === ChoreState.OPEN ||
        instance.state === ChoreState.ASSIGNED ||
        instance.state === ChoreState.IN_PROGRESS
    ).length;
    const leaderboard = household.members
      .map((member) => this.mapMember(member))
      .sort((left, right) => right.points - left.points || right.currentStreak - left.currentStreak);
    const streakLeader =
      [...leaderboard].sort(
        (left, right) => right.currentStreak - left.currentStreak || right.points - left.points
      )[0]?.displayName ?? "Nobody";

    return {
      pendingApprovals,
      activeChores,
      streakLeader,
      leaderboard
    };
  }

  async getTemplates(householdId: string, language: SupportedLanguage = fallbackLanguage) {
    const templates = await this.prisma.choreTemplate.findMany({
      where: {
        householdId
      },
      include: {
        checklistItems: true,
        dependencies: true,
        variants: true
      },
      orderBy: {
        title: "asc"
      }
    });

    return templates
      .map((template) => this.mapTemplate(template, language))
      .sort((left, right) => left.title.localeCompare(right.title));
  }

  async getTemplateForHousehold(
    templateId: string,
    householdId: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const template = await this.prisma.choreTemplate.findFirst({
      where: {
        id: templateId,
        householdId
      },
      include: {
        checklistItems: true,
        dependencies: true,
        variants: true
      }
    });

    return template ? this.mapTemplate(template, language) : null;
  }

  async createTemplate(
    dto: CreateChoreTemplateDto,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const dependencyRules = this.normalizeDependencyRules(dto);
    const dependencyTemplateIds = dependencyRules.map((rule) => rule.followUpTemplateId);
    const normalizedDefaultLocale = this.normalizeSupportedLanguage(dto.defaultLocale);
    const titleTranslations = this.normalizeTemplateTitleTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.title
    );
    const descriptionTranslations = this.normalizeTemplateDescriptionTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.description
    );

    if (dependencyTemplateIds.length > 0) {
      const availableDependencies = await this.prisma.choreTemplate.findMany({
        where: {
          householdId,
          id: {
            in: dependencyTemplateIds
          }
        },
        select: {
          id: true
        }
      });

      if (availableDependencies.length !== dependencyTemplateIds.length) {
        throw new NotFoundException({
          message: "One or more follow-up templates could not be found."
        });
      }
    }

    const template = await this.prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.choreTemplate.create({
        data: {
          householdId,
          defaultLocale: normalizedDefaultLocale,
          title: dto.title.trim(),
          titleTranslations: this.toPrismaJsonOrNull(titleTranslations),
          description: dto.description.trim(),
          descriptionTranslations: this.toPrismaJsonOrNull(descriptionTranslations),
          difficulty: dto.difficulty,
          basePoints: this.getBasePoints(dto.difficulty),
          assignmentStrategy: dto.assignmentStrategy,
          recurrenceType: dto.recurrenceType ?? RecurrenceType.NONE,
          recurrenceIntervalDays:
            dto.recurrenceType === RecurrenceType.EVERY_X_DAYS ? dto.recurrenceIntervalDays ?? 1 : null,
          recurrenceWeekdays:
            dto.recurrenceType === RecurrenceType.CUSTOM_WEEKLY ? dto.recurrenceWeekdays ?? [] : [],
          requirePhotoProof: dto.requirePhotoProof,
          recurrenceStartStrategy: dto.recurrenceStartStrategy ?? RecurrenceStartStrategy.DUE_AT,
          checklistItems: {
            create:
              dto.checklist?.map((item, index) => ({
                title: item.title.trim(),
                required: item.required,
                sortOrder: index + 1
              })) ?? []
          },
          dependencies: {
            create: dependencyRules.map((dependencyRule) => ({
              followUpTemplateId: dependencyRule.followUpTemplateId,
              followUpDelayValue: dependencyRule.followUpDelayValue,
              followUpDelayUnit: dependencyRule.followUpDelayUnit
            }))
          },
          variants: {
            create: (dto.variants ?? []).map((v, i) => ({
              label: v.label.trim(),
              labelTranslations: this.toPrismaJsonOrNull(
                this.normalizeVariantLabelTranslations(v.translations, normalizedDefaultLocale, v.label)
              ),
              sortOrder: i + 1
            }))
          }
        },
        include: {
          checklistItems: true,
          dependencies: true,
          variants: true
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "template.created",
        entityType: "chore_template",
        entityId: createdTemplate.id,
        summary: `Created chore template "${createdTemplate.title}".`
      });

      return createdTemplate;
    });

    return this.mapTemplate(template, language);
  }

  async updateTemplate(
    templateId: string,
    dto: CreateChoreTemplateDto,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const dependencyRules = this.normalizeDependencyRules(dto, templateId);
    const dependencyTemplateIds = dependencyRules.map((rule) => rule.followUpTemplateId);
    const existingTemplate = await this.prisma.choreTemplate.findFirst({
      where: {
        id: templateId,
        householdId
      },
      include: {
        variants: true
      }
    });

    if (!existingTemplate) {
      throw new NotFoundException({
        message: "That chore template could not be found."
      });
    }

    const normalizedDefaultLocale = this.normalizeSupportedLanguage(
      dto.defaultLocale ?? existingTemplate.defaultLocale
    );
    const titleTranslations = this.normalizeTemplateTitleTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.title
    );
    const descriptionTranslations = this.normalizeTemplateDescriptionTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.description
    );

    if (dependencyTemplateIds.length > 0) {
      const availableDependencies = await this.prisma.choreTemplate.findMany({
        where: {
          householdId,
          id: {
            in: dependencyTemplateIds
          }
        },
        select: {
          id: true
        }
      });

      if (availableDependencies.length !== dependencyTemplateIds.length) {
        throw new NotFoundException({
          message: "One or more follow-up templates could not be found."
        });
      }
    }

    const template = await this.prisma.$transaction(async (tx) => {
      await tx.choreTemplateChecklistItem.deleteMany({
        where: {
          templateId
        }
      });

      await tx.choreTemplateDependency.deleteMany({
        where: {
          templateId
        }
      });

      const submittedVariantIds = new Set(
        (dto.variants ?? [])
          .map((variant) => variant.id)
          .filter((variantId): variantId is string => Boolean(variantId))
      );
      const variantIdsToDelete = existingTemplate.variants
        .filter((variant) => !submittedVariantIds.has(variant.id))
        .map((variant) => variant.id);

      if (variantIdsToDelete.length > 0) {
        await tx.choreTemplateVariant.deleteMany({
          where: {
            id: {
              in: variantIdsToDelete
            }
          }
        });
      }

      for (const [index, variantInput] of (dto.variants ?? []).entries()) {
        const normalizedVariantTranslations = this.normalizeVariantLabelTranslations(
          variantInput.translations,
          normalizedDefaultLocale,
          variantInput.label
        );

        if (variantInput.id) {
          await tx.choreTemplateVariant.update({
            where: {
              id: variantInput.id
            },
            data: {
              label: variantInput.label.trim(),
              labelTranslations: this.toPrismaJsonOrNull(normalizedVariantTranslations),
              sortOrder: index + 1
            }
          });
        } else {
          await tx.choreTemplateVariant.create({
            data: {
              templateId,
              label: variantInput.label.trim(),
              labelTranslations: this.toPrismaJsonOrNull(normalizedVariantTranslations),
              sortOrder: index + 1
            }
          });
        }
      }

      const updatedTemplate = await tx.choreTemplate.update({
        where: {
          id: templateId
        },
        data: {
          defaultLocale: normalizedDefaultLocale,
          title: dto.title.trim(),
          titleTranslations: this.toPrismaJsonOrNull(titleTranslations),
          description: dto.description.trim(),
          descriptionTranslations: this.toPrismaJsonOrNull(descriptionTranslations),
          difficulty: dto.difficulty,
          basePoints: this.getBasePoints(dto.difficulty),
          assignmentStrategy: dto.assignmentStrategy,
          recurrenceType: dto.recurrenceType ?? RecurrenceType.NONE,
          recurrenceIntervalDays:
            dto.recurrenceType === RecurrenceType.EVERY_X_DAYS ? dto.recurrenceIntervalDays ?? 1 : null,
          recurrenceWeekdays:
            dto.recurrenceType === RecurrenceType.CUSTOM_WEEKLY ? dto.recurrenceWeekdays ?? [] : [],
          requirePhotoProof: dto.requirePhotoProof,
          recurrenceStartStrategy: dto.recurrenceStartStrategy ?? RecurrenceStartStrategy.DUE_AT,
          checklistItems: {
            create:
              dto.checklist?.map((item, index) => ({
                title: item.title.trim(),
                required: item.required,
                sortOrder: index + 1
              })) ?? []
          },
          dependencies: {
            create: dependencyRules.map((dependencyRule) => ({
              followUpTemplateId: dependencyRule.followUpTemplateId,
              followUpDelayValue: dependencyRule.followUpDelayValue,
              followUpDelayUnit: dependencyRule.followUpDelayUnit
            }))
          }
        },
        include: {
          checklistItems: true,
          dependencies: true,
          variants: true
        }
      });

      return updatedTemplate;
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "template.updated",
      entityType: "chore_template",
      entityId: template.id,
      summary: `Updated chore template "${template.title}".`
    });

    return this.mapTemplate(template, language);
  }

  async deleteTemplate(templateId: string, householdId: string, actorUserId?: string) {
    const template = await this.prisma.choreTemplate.findFirst({
      where: {
        id: templateId,
        householdId
      },
      select: {
        id: true,
        title: true
      }
    });

    if (!template) {
      throw new NotFoundException({
        message: "That chore template could not be found."
      });
    }

    const instanceCount = await this.prisma.choreInstance.count({
      where: {
        templateId
      }
    });

    if (instanceCount > 0) {
      throw new ConflictException({
        message: "This chore template cannot be deleted because chores already use it."
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.choreTemplateDependency.deleteMany({
        where: {
          OR: [
            {
              templateId
            },
            {
              followUpTemplateId: templateId
            }
          ]
        }
      });

      await tx.choreTemplate.delete({
        where: {
          id: templateId
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "template.deleted",
        entityType: "chore_template",
        entityId: template.id,
        summary: `Deleted chore template "${template.title}".`
      });
    });

    return {
      ok: true
    };
  }

  async createInstance(
    dto: CreateChoreInstanceDto,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const template = await this.prisma.choreTemplate.findFirstOrThrow({
      where: {
        id: dto.templateId,
        householdId
      },
      include: {
        checklistItems: true,
        variants: true
      }
    });

    const variant = dto.variantId
      ? template.variants.find((entry) => entry.id === dto.variantId) ?? null
      : null;
    if (dto.variantId && !variant) {
      throw new BadRequestException({
        message: "The selected subtype could not be found for this chore type."
      });
    }
    const subtypeLabel = variant?.label ?? null;

    const effectiveAssignmentStrategy = dto.assignmentStrategy ?? template.assignmentStrategy;
    const effectiveRecurrenceType =
      dto.suppressRecurrence === true
        ? RecurrenceType.NONE
        : dto.recurrenceType ?? template.recurrenceType;
    const effectiveRecurrenceIntervalDays =
      effectiveRecurrenceType === RecurrenceType.EVERY_X_DAYS
        ? dto.recurrenceIntervalDays ?? template.recurrenceIntervalDays ?? 1
        : null;
    const effectiveRecurrenceWeekdays =
      effectiveRecurrenceType === RecurrenceType.CUSTOM_WEEKLY
        ? dto.recurrenceWeekdays ?? template.recurrenceWeekdays
        : [];
    const resolvedAssigneeId = dto.assigneeId
      ? await this.validateAssignee(this.prisma, dto.assigneeId, householdId)
      : await this.resolveAssigneeForTemplate(
          this.prisma,
          householdId,
          template.id,
          effectiveAssignmentStrategy
        );

    const instance = await this.prisma.$transaction(async (tx) => {
      const createdInstance = await tx.choreInstance.create({
        data: {
          householdId,
          templateId: template.id,
          subtypeLabel,
          requirePhotoProofOverride: template.requirePhotoProof,
          title: dto.title?.trim() || this.composeChoreTitle(template.title, subtypeLabel),
          state: resolvedAssigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          assigneeId: resolvedAssigneeId,
          dueAtUtc: dto.dueAt,
          suppressRecurrence: effectiveRecurrenceType === RecurrenceType.NONE,
          variantId: dto.variantId ?? null,
          assignmentStrategyOverride:
            effectiveAssignmentStrategy !== template.assignmentStrategy ? effectiveAssignmentStrategy : null,
          recurrenceTypeOverride:
            effectiveRecurrenceType !== template.recurrenceType ? effectiveRecurrenceType : null,
          recurrenceIntervalDaysOverride:
            effectiveRecurrenceType === RecurrenceType.EVERY_X_DAYS &&
            effectiveRecurrenceIntervalDays !== template.recurrenceIntervalDays
              ? effectiveRecurrenceIntervalDays
              : null,
          recurrenceWeekdaysOverride:
            effectiveRecurrenceType === RecurrenceType.CUSTOM_WEEKLY &&
            JSON.stringify(effectiveRecurrenceWeekdays) !== JSON.stringify(template.recurrenceWeekdays)
              ? effectiveRecurrenceWeekdays
              : []
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          variant: true,
          checklistCompletions: true,
          attachments: true
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "instance.created",
        entityType: "chore_instance",
        entityId: createdInstance.id,
        summary: `Scheduled chore "${createdInstance.title}".`
      });

      if (resolvedAssigneeId && resolvedAssigneeId !== actorUserId) {
        await this.recordNotification(tx, {
          householdId,
          recipientUserId: resolvedAssigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "New chore assigned",
          message: `"${createdInstance.title}" was assigned to you.`,
          entityType: "chore_instance",
          entityId: createdInstance.id
        });
      }

      return createdInstance;
    });

    return this.mapInstance(instance, undefined, language);
  }

  async getInstances(householdId: string, language: SupportedLanguage = fallbackLanguage) {
    const instances = await this.prisma.choreInstance.findMany({
      where: {
        householdId
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      },
      orderBy: {
        dueAtUtc: "asc"
      }
    });

    return instances.map((instance) => this.mapInstance(instance, undefined, language));
  }

  async getInstancesForViewer(user: {
    id: string;
    householdId: string;
    role: "admin" | "parent" | "child";
  }, language: SupportedLanguage = fallbackLanguage) {
    const [settings, instances] = await Promise.all([
      this.prisma.householdSettings.findUnique({
        where: {
          householdId: user.householdId
        }
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId: user.householdId
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          variant: true,
          checklistCompletions: true,
          attachments: true
        },
        orderBy: {
          dueAtUtc: "asc"
        }
      })
    ]);

    const shouldRestrictOtherChores =
      user.role === "child" && !(settings?.membersCanSeeFullHouseholdChoreDetails ?? true);
    const assigneeIds = Array.from(
      new Set(instances.map((instance) => instance.assigneeId).filter((assigneeId): assigneeId is string => Boolean(assigneeId)))
    );
    const assigneeDisplayNameById = new Map<string, string | null>();

    if (assigneeIds.length > 0) {
      const assignees = await this.prisma.user.findMany({
        where: {
          id: {
            in: assigneeIds
          }
        },
        select: {
          id: true,
          displayName: true
        }
      });

      assignees.forEach((assignee) => {
        assigneeDisplayNameById.set(assignee.id, assignee.displayName);
      });
    }

    return instances.map((instance) =>
      this.mapInstance(instance, {
        redactDetails: shouldRestrictOtherChores && instance.assigneeId !== user.id,
        assigneeDisplayName: instance.assigneeId ? assigneeDisplayNameById.get(instance.assigneeId) ?? null : null
      }, language)
    );
  }

  async getPendingTakeoverRequests(
    householdId: string,
    viewerUserId: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const requests = await this.prisma.choreTakeoverRequest.findMany({
      where: {
        householdId,
        status: ChoreTakeoverRequestStatus.PENDING,
        OR: [
          {
            requestedUserId: viewerUserId
          },
          {
            requesterUserId: viewerUserId
          }
        ]
      },
      include: {
        choreInstance: {
          include: {
            template: true,
            variant: true
          }
        },
        requester: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        },
        requested: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAtUtc: "desc"
      }
    });

    return requests.map((request) => this.mapTakeoverRequest(request, language));
  }

  async updateInstance(
    instanceId: string,
    dto: CreateChoreInstanceDto,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const existingInstance = await this.prisma.choreInstance.findFirstOrThrow({
      where: {
        id: instanceId,
        householdId
      },
      select: {
        assigneeId: true
      }
    });

    const template = await this.prisma.choreTemplate.findFirstOrThrow({
      where: {
        id: dto.templateId,
        householdId
      },
      include: {
        variants: true
      }
    });

    const variant = dto.variantId
      ? template.variants.find((entry) => entry.id === dto.variantId) ?? null
      : null;
    if (dto.variantId && !variant) {
      throw new BadRequestException({
        message: "The selected subtype could not be found for this chore type."
      });
    }
    const subtypeLabel = variant?.label ?? null;

    const resolvedAssigneeId = dto.assigneeId
      ? await this.validateAssignee(this.prisma, dto.assigneeId, householdId)
      : await this.resolveAssigneeForTemplate(
          this.prisma,
          householdId,
          template.id,
          template.assignmentStrategy
        );

    const updatedInstance = await this.prisma.$transaction(async (tx) => {
      const savedInstance = await tx.choreInstance.update({
        where: {
          id: instanceId
        },
        data: {
          templateId: template.id,
          subtypeLabel,
          requirePhotoProofOverride: template.requirePhotoProof,
          title: dto.title?.trim() || this.composeChoreTitle(template.title, subtypeLabel),
          variantId: dto.variantId ?? null,
          assigneeId: resolvedAssigneeId,
          state: resolvedAssigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          dueAtUtc: dto.dueAt
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          variant: true,
          checklistCompletions: true,
          attachments: true
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "instance.updated",
        entityType: "chore_instance",
        entityId: savedInstance.id,
        summary: `Updated chore "${savedInstance.title}".`
      });

      if (resolvedAssigneeId && resolvedAssigneeId !== existingInstance.assigneeId && resolvedAssigneeId !== actorUserId) {
        await this.recordNotification(tx, {
          householdId,
          recipientUserId: resolvedAssigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "Chore assignment updated",
          message: `"${savedInstance.title}" is now assigned to you.`,
          entityType: "chore_instance",
          entityId: savedInstance.id
        });
      }

      return savedInstance;
    });

    return this.mapInstance(updatedInstance, undefined, language);
  }

  async getInstanceForHousehold(
    instanceId: string,
    householdId: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const instance = await this.prisma.choreInstance.findFirst({
      where: {
        id: instanceId,
        householdId
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      }
    });

    return instance ? this.mapInstance(instance, undefined, language) : null;
  }

  async getAttachmentForViewer(user: {
    id: string;
    householdId: string;
    role: "admin" | "parent" | "child";
  }, attachmentId: string) {
    const [settings, attachment] = await Promise.all([
      user.role === "child"
        ? this.prisma.householdSettings.findUnique({
            where: {
              householdId: user.householdId
            }
          })
        : Promise.resolve(null),
      this.prisma.choreAttachment.findFirst({
        where: {
          id: attachmentId,
          choreInstance: {
            householdId: user.householdId
          }
        },
        include: {
          choreInstance: {
            select: {
              id: true,
              assigneeId: true
            }
          }
        }
      })
    ]);

    if (!attachment) {
      return null;
    }

    const shouldRestrictOtherChores =
      user.role === "child" && !(settings?.membersCanSeeFullHouseholdChoreDetails ?? true);

    if (shouldRestrictOtherChores && attachment.choreInstance.assigneeId !== user.id) {
      return null;
    }

    return {
      id: attachment.id,
      choreInstanceId: attachment.choreInstance.id,
      clientFilename: attachment.clientFilename,
      contentType: attachment.contentType,
      storageKey: attachment.storageKey
    };
  }

  async startInstance(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: instanceId
      },
      data: {
        state: ChoreState.IN_PROGRESS
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "instance.started",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: `Started chore "${updatedInstance.title}".`
    });

    return this.mapInstance(updatedInstance, undefined, language);
  }

  async takeOverInstance(
    instanceId: string,
    householdId: string,
    actorUserId: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: instanceId
      },
      data: {
        assigneeId: actorUserId,
        state: ChoreState.ASSIGNED
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "instance.taken_over",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: `Took over chore "${updatedInstance.title}".`
    });

    await this.prisma.choreTakeoverRequest.updateMany({
      where: {
        householdId,
        choreInstanceId: instanceId,
        status: ChoreTakeoverRequestStatus.PENDING
      },
      data: {
        status: ChoreTakeoverRequestStatus.CANCELLED,
        respondedAtUtc: new Date()
      }
    });

    const assignee = await this.prisma.user.findUnique({
      where: {
        id: actorUserId
      },
      select: {
        displayName: true
      }
    });

    return this.mapInstance(updatedInstance, {
      assigneeDisplayName: assignee?.displayName ?? null
    }, language);
  }

  async createTakeoverRequest(input: {
    householdId: string;
    instanceId: string;
    requesterUserId: string;
    requestedUserId: string;
    note?: string;
    conflictMessage: string;
    forbiddenMessage: string;
    language?: SupportedLanguage;
  }) {
    if (input.requesterUserId === input.requestedUserId) {
      throw new ForbiddenException({ message: input.forbiddenMessage });
    }

    const requestedUser = await this.prisma.user.findFirst({
      where: {
        id: input.requestedUserId,
        householdId: input.householdId
      },
      select: {
        id: true,
        displayName: true,
        role: true
      }
    });

    if (!requestedUser) {
      throw new ForbiddenException({ message: input.forbiddenMessage });
    }

    const existingPendingRequest = await this.prisma.choreTakeoverRequest.findFirst({
      where: {
        householdId: input.householdId,
        choreInstanceId: input.instanceId,
        requesterUserId: input.requesterUserId,
        requestedUserId: input.requestedUserId,
        status: ChoreTakeoverRequestStatus.PENDING
      }
    });

    if (existingPendingRequest) {
      throw new ConflictException({ message: input.conflictMessage });
    }

    const [requester, choreInstance] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: {
          id: input.requesterUserId
        },
        select: {
          displayName: true
        }
      }),
      this.prisma.choreInstance.findFirstOrThrow({
        where: {
          id: input.instanceId,
          householdId: input.householdId
        }
      })
    ]);

    const request = await this.prisma.$transaction(async (tx) => {
      const createdRequest = await tx.choreTakeoverRequest.create({
        data: {
          householdId: input.householdId,
          choreInstanceId: input.instanceId,
          requesterUserId: input.requesterUserId,
          requestedUserId: input.requestedUserId,
          note: input.note?.trim() || null
        },
        include: {
          choreInstance: {
            include: {
              template: true,
              variant: true
            }
          },
          requester: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          },
          requested: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          }
        }
      });

      await this.recordNotification(tx, {
        householdId: input.householdId,
        recipientUserId: input.requestedUserId,
        type: NotificationType.CHORE_TAKEOVER_REQUEST,
        title: "Takeover request",
        message: `"${requester.displayName}" asked you to take over "${choreInstance.title}".`,
        entityType: "chore_takeover_request",
        entityId: createdRequest.id
      });

      await this.recordAuditLog(tx, {
        householdId: input.householdId,
        actorUserId: input.requesterUserId,
        action: "instance.takeover_requested",
        entityType: "chore_instance",
        entityId: choreInstance.id,
        summary: `Requested that "${requestedUser.displayName}" takes over chore "${choreInstance.title}".`
      });

      return createdRequest;
    });

    return this.mapTakeoverRequest(request, input.language ?? fallbackLanguage);
  }

  async approveTakeoverRequest(input: {
    requestId: string;
    householdId: string;
    actingUserId: string;
    note?: string;
    invalidStateMessage: string;
    notFoundMessage: string;
    forbiddenMessage: string;
    language?: SupportedLanguage;
  }) {
    const request = await this.prisma.choreTakeoverRequest.findFirst({
      where: {
        id: input.requestId,
        householdId: input.householdId
      },
      include: {
        choreInstance: {
          include: {
            template: {
              include: {
                checklistItems: true
              }
            },
            variant: true,
            checklistCompletions: true,
            attachments: true
          }
        },
        requester: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        },
        requested: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException({ message: input.notFoundMessage });
    }

    if (request.requestedUserId !== input.actingUserId) {
      throw new ForbiddenException({ message: input.forbiddenMessage });
    }

    if (
      request.status !== ChoreTakeoverRequestStatus.PENDING ||
      request.choreInstance.assigneeId !== request.requesterUserId ||
      request.choreInstance.state === ChoreState.COMPLETED ||
      request.choreInstance.state === ChoreState.CANCELLED ||
      request.choreInstance.state === ChoreState.PENDING_APPROVAL
    ) {
      throw new ConflictException({ message: input.invalidStateMessage });
    }

    const updatedInstance = await this.prisma.$transaction(async (tx) => {
      await tx.choreTakeoverRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: ChoreTakeoverRequestStatus.APPROVED,
          note: input.note?.trim() || request.note,
          respondedAtUtc: new Date()
        }
      });

      await tx.choreTakeoverRequest.updateMany({
        where: {
          choreInstanceId: request.choreInstanceId,
          status: ChoreTakeoverRequestStatus.PENDING,
          id: {
            not: request.id
          }
        },
        data: {
          status: ChoreTakeoverRequestStatus.CANCELLED,
          respondedAtUtc: new Date()
        }
      });

      const reassigned = await tx.choreInstance.update({
        where: {
          id: request.choreInstanceId
        },
        data: {
          assigneeId: input.actingUserId,
          state: ChoreState.ASSIGNED
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          variant: true,
          checklistCompletions: true,
          attachments: true
        }
      });

      await this.recordNotification(tx, {
        householdId: input.householdId,
        recipientUserId: request.requesterUserId,
        type: NotificationType.CHORE_TAKEOVER_APPROVED,
        title: "Takeover approved",
        message: `"${request.requested.displayName}" accepted the takeover request for "${request.choreInstance.title}".`,
        entityType: "chore_instance",
        entityId: request.choreInstanceId
      });

      await this.recordAuditLog(tx, {
        householdId: input.householdId,
        actorUserId: input.actingUserId,
        action: "instance.takeover_approved",
        entityType: "chore_instance",
        entityId: request.choreInstanceId,
        summary: `Accepted takeover request for chore "${request.choreInstance.title}".`
      });

      return reassigned;
    });

    return this.mapInstance(updatedInstance, {
      assigneeDisplayName: request.requested.displayName
    }, input.language ?? fallbackLanguage);
  }

  async declineTakeoverRequest(input: {
    requestId: string;
    householdId: string;
    actingUserId: string;
    note?: string;
    invalidStateMessage: string;
    notFoundMessage: string;
    forbiddenMessage: string;
    language?: SupportedLanguage;
  }) {
    const request = await this.prisma.choreTakeoverRequest.findFirst({
      where: {
        id: input.requestId,
        householdId: input.householdId
      },
      include: {
        choreInstance: {
          include: {
            template: true,
            variant: true
          }
        },
        requester: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        },
        requested: {
          select: {
            id: true,
            displayName: true,
            role: true
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException({ message: input.notFoundMessage });
    }

    if (request.requestedUserId !== input.actingUserId) {
      throw new ForbiddenException({ message: input.forbiddenMessage });
    }

    if (request.status !== ChoreTakeoverRequestStatus.PENDING) {
      throw new ConflictException({ message: input.invalidStateMessage });
    }

    const declinedRequest = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.choreTakeoverRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: ChoreTakeoverRequestStatus.DECLINED,
          note: input.note?.trim() || request.note,
          respondedAtUtc: new Date()
        },
        include: {
          choreInstance: {
            include: {
              template: true,
              variant: true
            }
          },
          requester: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          },
          requested: {
            select: {
              id: true,
              displayName: true,
              role: true
            }
          }
        }
      });

      await this.recordNotification(tx, {
        householdId: input.householdId,
        recipientUserId: request.requesterUserId,
        type: NotificationType.CHORE_TAKEOVER_DECLINED,
        title: "Takeover declined",
        message: `"${request.requested.displayName}" declined the takeover request for "${request.choreInstance.title}".`,
        entityType: "chore_instance",
        entityId: request.choreInstanceId
      });

      await this.recordAuditLog(tx, {
        householdId: input.householdId,
        actorUserId: input.actingUserId,
        action: "instance.takeover_declined",
        entityType: "chore_instance",
        entityId: request.choreInstanceId,
        summary: `Declined takeover request for chore "${request.choreInstance.title}".`
      });

      return updatedRequest;
    });

    return this.mapTakeoverRequest(declinedRequest, input.language ?? fallbackLanguage);
  }

  async submitInstance(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    completedChecklistItemIds: string[];
    attachments: SubmitAttachmentDto[];
    note?: string;
    awardedPoints: number;
    nextState: "pending_approval" | "completed";
    language?: SupportedLanguage;
  }) {
    const updatedInstance = await this.prisma.$transaction(async (tx) => {
      await tx.choreTakeoverRequest.updateMany({
        where: {
          choreInstanceId: input.instanceId,
          status: ChoreTakeoverRequestStatus.PENDING
        },
        data: {
          status: ChoreTakeoverRequestStatus.CANCELLED,
          respondedAtUtc: new Date()
        }
      });

      await tx.choreChecklistCompletion.deleteMany({
        where: {
          choreInstanceId: input.instanceId
        }
      });

      await tx.choreAttachment.deleteMany({
        where: {
          choreInstanceId: input.instanceId
        }
      });

      if (input.completedChecklistItemIds.length > 0) {
        await tx.choreChecklistCompletion.createMany({
          data: input.completedChecklistItemIds.map((checklistItemId) => ({
            choreInstanceId: input.instanceId,
            checklistItemId,
            completedById: input.actingUserId
          })),
          skipDuplicates: true
        });
      }

      if (input.attachments.length > 0) {
        await tx.choreAttachment.createMany({
          data: input.attachments.map((attachment) => ({
            choreInstanceId: input.instanceId,
            submittedById: input.actingUserId,
            clientFilename: attachment.clientFilename?.trim() || "proof-image",
            contentType: attachment.contentType?.trim() || null,
            storageKey: attachment.storageKey?.trim() || null
          }))
        });
      }

      const attachmentCount = input.attachments.length;
      const completedChecklistItems = input.completedChecklistItemIds.length;

      return tx.choreInstance.update({
        where: {
          id: input.instanceId
        },
        data: {
          state:
            input.nextState === "pending_approval" ? ChoreState.PENDING_APPROVAL : ChoreState.COMPLETED,
          submittedAtUtc: new Date(),
          submittedById: input.actingUserId,
          submissionNote: input.note?.trim() || null,
          attachmentCount,
          completedChecklistItems,
          awardedPoints: input.awardedPoints,
          completedAtUtc: input.nextState === "completed" ? new Date() : null,
          completedById: input.nextState === "completed" ? input.actingUserId : null
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          variant: true,
          checklistCompletions: true,
          attachments: true
        }
      });
    });

    if (input.nextState === "completed") {
      const beneficiaryUserId = updatedInstance.assigneeId ?? input.actingUserId;
      await this.prisma.user.update({
        where: {
          id: beneficiaryUserId
        },
        data: {
          points: {
            increment: input.awardedPoints
          },
          currentStreak: {
            increment: 1
          }
        }
      });

      await this.recordPointsLedgerEntry(this.prisma, {
        householdId: input.householdId,
        userId: beneficiaryUserId,
        choreInstanceId: updatedInstance.id,
        amount: input.awardedPoints,
        reason: `Completed chore "${updatedInstance.title}".`
      });

      await this.createFollowUpInstances(updatedInstance);
      await this.createRecurringInstance(updatedInstance);
    }

    if (input.nextState === "pending_approval") {
      const approvers = await this.prisma.user.findMany({
        where: {
          householdId: input.householdId,
          role: {
            in: [HouseholdRole.ADMIN, HouseholdRole.PARENT]
          },
          id: {
            not: input.actingUserId
          }
        },
        select: {
          id: true
        }
      });

      for (const approver of approvers) {
        await this.recordNotification(this.prisma, {
          householdId: input.householdId,
          recipientUserId: approver.id,
          type: NotificationType.CHORE_SUBMITTED,
          title: "Chore waiting for approval",
          message: `"${updatedInstance.title}" was submitted and is ready for review.`,
          entityType: "chore_instance",
          entityId: updatedInstance.id
        });
      }
    }

    await this.recordAuditLog(this.prisma, {
      householdId: input.householdId,
      actorUserId: input.actingUserId,
      action: input.nextState === "pending_approval" ? "instance.submitted" : "instance.completed",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary:
        input.nextState === "pending_approval"
          ? `Submitted chore "${updatedInstance.title}" for approval.`
          : `Completed chore "${updatedInstance.title}".`
    });

    return this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
  }

  async reviewInstance(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    approved: boolean;
    note?: string;
    awardedPoints: number;
    language?: SupportedLanguage;
  }) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: input.instanceId
      },
      data: {
        state: input.approved ? ChoreState.COMPLETED : ChoreState.NEEDS_FIXES,
        reviewedAtUtc: new Date(),
        reviewedById: input.actingUserId,
        reviewNote: input.note?.trim() || null,
        awardedPoints: input.approved ? input.awardedPoints : 0,
        completedAtUtc: input.approved ? new Date() : null,
        ...(input.approved ? {} : { completedById: null })
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      }
    });

    if (input.approved) {
      const beneficiaryUserId = updatedInstance.assigneeId ?? updatedInstance.submittedById;
      if (beneficiaryUserId) {
        await this.prisma.user.update({
          where: {
            id: beneficiaryUserId
          },
          data: {
            points: {
              increment: input.awardedPoints
            },
            currentStreak: {
              increment: 1
            }
          }
        });

        await this.recordPointsLedgerEntry(this.prisma, {
          householdId: input.householdId,
          userId: beneficiaryUserId,
          choreInstanceId: updatedInstance.id,
          amount: input.awardedPoints,
          reason: `Approved chore "${updatedInstance.title}".`
        });
      }

      await this.createFollowUpInstances(updatedInstance);
      await this.createRecurringInstance(updatedInstance);
    }

    const reviewRecipientUserId = updatedInstance.submittedById ?? updatedInstance.assigneeId;
    if (reviewRecipientUserId && reviewRecipientUserId !== input.actingUserId) {
      await this.recordNotification(this.prisma, {
        householdId: input.householdId,
        recipientUserId: reviewRecipientUserId,
        type: input.approved ? NotificationType.CHORE_APPROVED : NotificationType.CHORE_REJECTED,
        title: input.approved ? "Chore approved" : "Chore needs fixes",
        message: input.approved
          ? `"${updatedInstance.title}" was approved.`
          : `"${updatedInstance.title}" was reviewed and sent back for fixes.`,
        entityType: "chore_instance",
        entityId: updatedInstance.id
      });
    }

    await this.recordAuditLog(this.prisma, {
      householdId: input.householdId,
      actorUserId: input.actingUserId,
      action: input.approved ? "instance.approved" : "instance.rejected",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: input.approved
        ? `Approved chore "${updatedInstance.title}".`
        : `Rejected chore "${updatedInstance.title}" and sent it back for fixes.`
    });

    return this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
  }

  async cancelInstance(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: instanceId
      },
      data: {
        state: ChoreState.CANCELLED
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        variant: true,
        checklistCompletions: true,
        attachments: true
      }
    });

    await this.recordAuditLog(this.prisma, {
      householdId,
      actorUserId,
      action: "instance.cancelled",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: `Cancelled chore "${updatedInstance.title}".`
    });

    if (updatedInstance.assigneeId && updatedInstance.assigneeId !== actorUserId) {
      await this.recordNotification(this.prisma, {
        householdId,
        recipientUserId: updatedInstance.assigneeId,
        type: NotificationType.CHORE_CANCELLED,
        title: "Chore cancelled",
        message: `"${updatedInstance.title}" was cancelled and removed from your active chores.`,
        entityType: "chore_instance",
        entityId: updatedInstance.id
      });
    }

    return this.mapInstance(updatedInstance, undefined, language);
  }

  throwNotFound(message: string): never {
    throw new NotFoundException({ message });
  }

  throwForbidden(message: string): never {
    throw new ForbiddenException({ message });
  }

  throwConflict(message: string): never {
    throw new ConflictException({ message });
  }

  async seedDemoDataIfNeeded(enabled: boolean) {
    if (!enabled) {
      return;
    }

    const existingCount = await this.prisma.household.count();
    if (existingCount > 0) {
      return;
    }

    const householdId = "b5a1f703-c90a-4227-8345-4dfe1ce2fd75";
    const adminId = "e4ff7c6d-d986-4fdc-9b97-9b525cab4f29";
    const parentId = "b3d2f3c6-b1ea-43d5-9f1b-4f6bc6c2b6c4";
    const childId = "07b7df84-a4b4-4d46-8688-5ca8b0d31f8c";
    const laundryTemplateId = "3ab30e4c-06b0-4c89-90df-b1c4094a49d2";
    const dryingTemplateId = "8931210f-1c7e-4890-87da-ebda235fd6f1";
    const demoPasswordHash = await hash("TaskBandit123!", 12);

    await this.prisma.household.create({
      data: {
        id: householdId,
        name: "TaskBandit Home",
        settings: {
          create: {
            selfSignupEnabled: false,
            onboardingCompleted: false,
            membersCanSeeFullHouseholdChoreDetails: true,
            enablePushNotifications: true,
            enableOverduePenalties: true,
            localAuthEnabled: true,
            oidcEnabled: false,
            oidcScope: "openid profile email",
            smtpEnabled: false,
            smtpSecure: false
          }
        },
        members: {
          create: [
            {
              id: adminId,
              displayName: "Alex",
              role: HouseholdRole.ADMIN,
              points: 120,
              currentStreak: 4,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "alex@taskbandit.local",
                  email: "alex@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            },
            {
              id: parentId,
              displayName: "Maya",
              role: HouseholdRole.PARENT,
              points: 95,
              currentStreak: 3,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "maya@taskbandit.local",
                  email: "maya@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            },
            {
              id: childId,
              displayName: "Luca",
              role: HouseholdRole.CHILD,
              points: 40,
              currentStreak: 2,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "luca@taskbandit.local",
                  email: "luca@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            }
          ]
        },
        choreTemplates: {
          create: [
            {
              id: laundryTemplateId,
              title: "Run the washing machine",
              description: "Load, start, and confirm the wash cycle.",
              difficulty: Difficulty.MEDIUM,
              basePoints: 20,
              assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
              requirePhotoProof: false,
              checklistItems: {
                create: [
                  { title: "Add detergent", required: true, sortOrder: 1 },
                  { title: "Start cycle", required: true, sortOrder: 2 }
                ]
              },
              dependencies: {
                create: [
                  {
                    followUpTemplateId: dryingTemplateId,
                    followUpDelayValue: 2,
                    followUpDelayUnit: FollowUpDelayUnit.HOURS
                  }
                ]
              }
            },
            {
              id: dryingTemplateId,
              title: "Hang clothes to dry",
              description: "Move the washed laundry to the drying rack.",
              difficulty: Difficulty.EASY,
              basePoints: 10,
              assignmentStrategy: AssignmentStrategyType.LEAST_COMPLETED_RECENTLY,
              requirePhotoProof: true,
              checklistItems: {
                create: [{ title: "Hang all clothes", required: true, sortOrder: 1 }]
              }
            }
          ]
        },
        choreInstances: {
          create: [
            {
              title: "Run the washing machine",
              state: ChoreState.ASSIGNED,
              templateId: laundryTemplateId,
              assigneeId: childId,
              dueAtUtc: new Date(Date.now() + 4 * 60 * 60 * 1000)
            }
          ]
        }
      }
    });
  }

  private getBasePoints(difficulty: Difficulty) {
    switch (difficulty) {
      case Difficulty.EASY:
        return 10;
      case Difficulty.MEDIUM:
        return 20;
      case Difficulty.HARD:
        return 40;
      default:
        return 10;
    }
  }

  private normalizeDependencyRules(dto: CreateChoreTemplateDto, templateId?: string) {
    const normalizedRules = (dto.dependencyRules ?? [])
      .map((dependencyRule) => ({
        followUpTemplateId: dependencyRule.templateId,
        followUpDelayValue: Math.max(1, Math.floor(dependencyRule.delayValue ?? 1)),
        followUpDelayUnit: dependencyRule.delayUnit ?? FollowUpDelayUnit.HOURS
      }))
      .filter((dependencyRule) =>
        templateId ? dependencyRule.followUpTemplateId !== templateId : true
      );

    if (normalizedRules.length > 0) {
      const uniqueRules = new Map<
        string,
        {
          followUpTemplateId: string;
          followUpDelayValue: number;
          followUpDelayUnit: FollowUpDelayUnit;
        }
      >();

      for (const dependencyRule of normalizedRules) {
        uniqueRules.set(dependencyRule.followUpTemplateId, dependencyRule);
      }

      return [...uniqueRules.values()];
    }

    return [...new Set(dto.dependencyTemplateIds ?? [])]
      .filter((dependencyId) => (templateId ? dependencyId !== templateId : true))
      .map((followUpTemplateId) => ({
        followUpTemplateId,
        followUpDelayValue: 1,
        followUpDelayUnit: FollowUpDelayUnit.HOURS
      }));
  }

  private async validateAssignee(
    executor: PrismaExecutor,
    assigneeId: string,
    householdId: string
  ) {
    const assignee = await executor.user.findFirst({
      where: {
        id: assigneeId,
        householdId
      },
      select: {
        id: true
      }
    });

    if (!assignee) {
      throw new NotFoundException({
        message: "That assignee could not be found."
      });
    }

    return assignee.id;
  }

  private async resolveAssigneeForTemplate(
    executor: PrismaExecutor,
    householdId: string,
    templateId: string,
    strategy: AssignmentStrategyType
  ) {
    const members = await executor.user.findMany({
      where: {
        householdId
      },
      orderBy: [{ createdAtUtc: "asc" }, { displayName: "asc" }]
    });

    if (members.length === 0 || strategy === AssignmentStrategyType.MANUAL_DEFAULT_ASSIGNEE) {
      return null;
    }

    switch (strategy) {
      case AssignmentStrategyType.ROUND_ROBIN: {
        const lastAssigned = await executor.choreInstance.findFirst({
          where: {
            householdId,
            templateId,
            assigneeId: {
              not: null
            }
          },
          orderBy: [{ createdAtUtc: "desc" }],
          select: {
            assigneeId: true
          }
        });

        if (!lastAssigned?.assigneeId) {
          return members[0]?.id ?? null;
        }

        const currentIndex = members.findIndex((member) => member.id === lastAssigned.assigneeId);
        if (currentIndex < 0) {
          return members[0]?.id ?? null;
        }

        return members[(currentIndex + 1) % members.length]?.id ?? null;
      }
      case AssignmentStrategyType.LEAST_COMPLETED_RECENTLY: {
        const completions = await executor.choreInstance.findMany({
          where: {
            householdId,
            templateId,
            assigneeId: {
              not: null
            },
            completedAtUtc: {
              not: null
            }
          },
          select: {
            assigneeId: true,
            completedAtUtc: true
          },
          orderBy: [{ completedAtUtc: "desc" }]
        });

        const lastCompletionByUser = new Map<string, Date>();
        for (const completion of completions) {
          if (completion.assigneeId && !lastCompletionByUser.has(completion.assigneeId)) {
            lastCompletionByUser.set(completion.assigneeId, completion.completedAtUtc!);
          }
        }

        return [...members]
          .sort((left, right) => {
            const leftTime = lastCompletionByUser.get(left.id)?.getTime() ?? 0;
            const rightTime = lastCompletionByUser.get(right.id)?.getTime() ?? 0;
            if (leftTime !== rightTime) {
              return leftTime - rightTime;
            }

            return left.displayName.localeCompare(right.displayName);
          })[0]
          ?.id;
      }
      case AssignmentStrategyType.HIGHEST_STREAK:
        return [...members]
          .sort(
            (left, right) =>
              right.currentStreak - left.currentStreak ||
              right.points - left.points ||
              left.displayName.localeCompare(right.displayName)
          )[0]
          ?.id;
      default:
        return null;
    }
  }

  private async createFollowUpInstances(
    instance: Prisma.ChoreInstanceGetPayload<{
      include: {
        template: { include: { checklistItems: true } };
        checklistCompletions: true;
        attachments: true;
      };
    }>
  ) {
    const dependencies = await this.prisma.choreTemplateDependency.findMany({
      where: {
        templateId: instance.templateId
      },
      select: {
        followUpTemplateId: true,
        followUpDelayValue: true,
        followUpDelayUnit: true
      }
    });

    if (dependencies.length === 0) {
      return;
    }

    const dependencyTemplateIds = dependencies.map((dependency) => dependency.followUpTemplateId);
    const followUpTemplates = await this.prisma.choreTemplate.findMany({
      where: {
        householdId: instance.householdId,
        id: {
          in: dependencyTemplateIds
        }
      },
      include: {
        variants: true
      },
      orderBy: {
        title: "asc"
      }
    });

    if (followUpTemplates.length === 0) {
      return;
    }

    const followUpTemplateLookup = new Map(followUpTemplates.map((template) => [template.id, template]));
    const carriedSubtypeLabel = (instance as any).subtypeLabel ?? null;
    const carriedRequirePhotoProof =
      (instance as any).requirePhotoProofOverride ?? instance.template.requirePhotoProof;

    await this.prisma.$transaction(async (tx) => {
      for (const dependency of dependencies) {
        const template = followUpTemplateLookup.get(dependency.followUpTemplateId);
        if (!template) {
          continue;
        }

        const followUpDueAt = this.calculateFollowUpDueAt(
          instance.completedAtUtc ?? new Date(),
          dependency.followUpDelayValue,
          dependency.followUpDelayUnit
        );

        const assigneeId = await this.resolveAssigneeForTemplate(
          tx,
          instance.householdId,
          template.id,
          template.assignmentStrategy
        );
        const matchingVariant = carriedSubtypeLabel
          ? template.variants.find(
              (entry) => entry.label.trim().toLowerCase() === carriedSubtypeLabel.trim().toLowerCase()
            ) ?? null
          : null;
        const followUpTitle = this.composeChoreTitle(template.title, carriedSubtypeLabel);
        const effectiveFollowUpRequirePhotoProof = carriedRequirePhotoProof || template.requirePhotoProof;

        await tx.choreInstance.create({
          data: {
            householdId: instance.householdId,
            templateId: template.id,
            title: followUpTitle,
            subtypeLabel: carriedSubtypeLabel,
            requirePhotoProofOverride: effectiveFollowUpRequirePhotoProof,
            state: assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
            assigneeId,
            dueAtUtc: followUpDueAt,
            variantId: matchingVariant?.id ?? null
          }
        });

        if (assigneeId) {
          await this.recordNotification(tx, {
            householdId: instance.householdId,
            recipientUserId: assigneeId,
            type: NotificationType.CHORE_ASSIGNED,
            title: "Follow-up chore assigned",
            message: `"${followUpTitle}" was created as a follow-up chore for you.`,
            entityType: "chore_template",
            entityId: template.id
          });
        }
      }
    });
  }

  private async createRecurringInstance(
    instance: Prisma.ChoreInstanceGetPayload<{
      include: {
        template: { include: { checklistItems: true } };
        checklistCompletions: true;
        attachments: true;
      };
    }>
  ) {
    if (instance.suppressRecurrence) {
      return;
    }

    const template = await this.prisma.choreTemplate.findFirst({
      where: {
        id: instance.templateId,
        householdId: instance.householdId
      },
      include: { variants: true }
    });

    if (!template) {
      return;
    }

    const effectiveAssignmentStrategy = instance.assignmentStrategyOverride ?? template.assignmentStrategy;
    const effectiveRecurrenceType = instance.recurrenceTypeOverride ?? template.recurrenceType;
    const effectiveRecurrenceIntervalDays =
      instance.recurrenceTypeOverride === RecurrenceType.EVERY_X_DAYS
        ? instance.recurrenceIntervalDaysOverride
        : template.recurrenceIntervalDays;
    const effectiveRecurrenceWeekdays =
      instance.recurrenceTypeOverride === RecurrenceType.CUSTOM_WEEKLY
        ? instance.recurrenceWeekdaysOverride
        : template.recurrenceWeekdays;
    const effectiveStartStrategy = template.recurrenceStartStrategy;

    // Choose base date based on strategy
    const baseDate =
      effectiveStartStrategy === RecurrenceStartStrategy.COMPLETED_AT
        ? (instance.completedAtUtc ?? instance.dueAtUtc)
        : instance.dueAtUtc;

    let nextDueAt = this.calculateRecurringDueAt(
      baseDate,
      effectiveRecurrenceType,
      effectiveRecurrenceIntervalDays,
      effectiveRecurrenceWeekdays
    );

    if (!nextDueAt) {
      return;
    }

    // Advance past-dated results forward (can occur with DUE_AT strategy on overdue chores)
    const now = new Date();
    if (nextDueAt <= now && effectiveRecurrenceType !== RecurrenceType.NONE) {
      let attempts = 0;
      while (nextDueAt <= now && attempts < 1000) {
        const advanced = this.calculateRecurringDueAt(
          nextDueAt,
          effectiveRecurrenceType,
          effectiveRecurrenceIntervalDays,
          effectiveRecurrenceWeekdays
        );
        if (!advanced || advanced.getTime() === nextDueAt.getTime()) {
          break;
        }
        nextDueAt = advanced;
        attempts++;
      }
    }

    // Look up the variant from the completed instance (if any)
    const variantId = (instance as any).variantId ?? null;
    const variant = variantId
      ? template.variants.find((v) => v.id === variantId) ?? null
      : null;
    const subtypeLabel = (instance as any).subtypeLabel ?? variant?.label ?? null;
    const requirePhotoProof =
      (instance as any).requirePhotoProofOverride ?? instance.template.requirePhotoProof;
    const instanceTitle = this.composeChoreTitle(template.title, subtypeLabel);

    await this.prisma.$transaction(async (tx) => {
      const assigneeId = await this.resolveAssigneeForTemplate(
        tx,
        instance.householdId,
        template.id,
        effectiveAssignmentStrategy
      );

      await tx.choreInstance.create({
        data: {
          householdId: instance.householdId,
          templateId: template.id,
          title: instanceTitle,
          state: assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          assigneeId,
          dueAtUtc: nextDueAt,
          suppressRecurrence: false,
          variantId: variantId,
          subtypeLabel,
          requirePhotoProofOverride: requirePhotoProof,
          assignmentStrategyOverride: instance.assignmentStrategyOverride,
          recurrenceTypeOverride: instance.recurrenceTypeOverride,
          recurrenceIntervalDaysOverride: instance.recurrenceIntervalDaysOverride,
          recurrenceWeekdaysOverride: instance.recurrenceWeekdaysOverride
        }
      });

      if (assigneeId) {
        await this.recordNotification(tx, {
          householdId: instance.householdId,
          recipientUserId: assigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "Recurring chore assigned",
          message: `"${instanceTitle}" was scheduled again and assigned to you.`,
          entityType: "chore_template",
          entityId: template.id
        });
      }
    });
  }

  private calculateFollowUpDueAt(
    completedAtUtc: Date,
    followUpDelayValue: number,
    followUpDelayUnit: FollowUpDelayUnit
  ) {
    const normalizedDelayValue = Math.max(1, Math.floor(followUpDelayValue));
    const delayHours =
      followUpDelayUnit === FollowUpDelayUnit.DAYS
        ? normalizedDelayValue * 24
        : normalizedDelayValue;

    if (!Number.isFinite(delayHours) || delayHours <= 0) {
      return new Date(completedAtUtc.getTime() + 60 * 60 * 1000);
    }

    return new Date(completedAtUtc.getTime() + delayHours * 60 * 60 * 1000);
  }

  private calculateRecurringDueAt(
    currentDueAtUtc: Date,
    recurrenceType: RecurrenceType,
    recurrenceIntervalDays: number | null,
    recurrenceWeekdays: string[]
  ) {
    switch (recurrenceType) {
      case RecurrenceType.DAILY:
        return new Date(currentDueAtUtc.getTime() + 24 * 60 * 60 * 1000);
      case RecurrenceType.WEEKLY:
        return new Date(currentDueAtUtc.getTime() + 7 * 24 * 60 * 60 * 1000);
      case RecurrenceType.MONTHLY: {
        const nextDueAt = new Date(currentDueAtUtc);
        nextDueAt.setUTCMonth(nextDueAt.getUTCMonth() + 1);
        return nextDueAt;
      }
      case RecurrenceType.EVERY_X_DAYS:
        return new Date(currentDueAtUtc.getTime() + (recurrenceIntervalDays ?? 1) * 24 * 60 * 60 * 1000);
      case RecurrenceType.CUSTOM_WEEKLY: {
        const targetWeekdays = new Set<number>();
        for (const weekday of recurrenceWeekdays) {
          const index = this.getWeekdayIndex(weekday);
          if (index !== null) {
            targetWeekdays.add(index);
          }
        }

        if (targetWeekdays.size === 0) {
          return null;
        }

        for (let offsetDays = 1; offsetDays <= 7; offsetDays += 1) {
          const candidate = new Date(currentDueAtUtc.getTime() + offsetDays * 24 * 60 * 60 * 1000);
          if (targetWeekdays.has(candidate.getUTCDay())) {
            return candidate;
          }
        }

        return null;
      }
      case RecurrenceType.NONE:
      default:
        return null;
    }
  }

  private getWeekdayIndex(weekday: string) {
    switch (weekday) {
      case "SUNDAY":
        return 0;
      case "MONDAY":
        return 1;
      case "TUESDAY":
        return 2;
      case "WEDNESDAY":
        return 3;
      case "THURSDAY":
        return 4;
      case "FRIDAY":
        return 5;
      case "SATURDAY":
        return 6;
      default:
        return null;
    }
  }

  private mapHousehold(
    household: Prisma.HouseholdGetPayload<{
      include: {
        settings: true;
        members: {
          include: {
            identities: true;
          };
        };
      };
    }>,
    options?: {
      redactMemberEmails?: boolean;
    }
  ) {
    return {
      householdId: household.id,
      name: household.name,
      settings: {
        selfSignupEnabled: household.settings?.selfSignupEnabled ?? false,
        onboardingCompleted: household.settings?.onboardingCompleted ?? false,
        membersCanSeeFullHouseholdChoreDetails:
          household.settings?.membersCanSeeFullHouseholdChoreDetails ?? true,
        enablePushNotifications: household.settings?.enablePushNotifications ?? true,
        enableOverduePenalties: household.settings?.enableOverduePenalties ?? true,
        localAuthEnabled: household.settings?.localAuthEnabled ?? true,
        localAuthForcedByConfig: false,
        localAuthEffective: household.settings?.localAuthEnabled ?? true,
        oidcEnabled: household.settings?.oidcEnabled ?? false,
        oidcAuthority: household.settings?.oidcAuthority ?? "",
        oidcClientId: household.settings?.oidcClientId ?? "",
        oidcClientSecret: household.settings?.oidcClientSecret ?? "",
        oidcClientSecretConfigured: Boolean(household.settings?.oidcClientSecret),
        oidcScope: household.settings?.oidcScope ?? "openid profile email",
        oidcEffective: household.settings?.oidcEnabled ?? false,
        oidcSource: "ui",
        smtpEnabled: household.settings?.smtpEnabled ?? false,
        smtpHost: household.settings?.smtpHost ?? "",
        smtpPort: household.settings?.smtpPort ?? 587,
        smtpSecure: household.settings?.smtpSecure ?? false,
        smtpUsername: household.settings?.smtpUsername ?? "",
        smtpPassword: household.settings?.smtpPassword ?? "",
        smtpPasswordConfigured: Boolean(household.settings?.smtpPassword),
        smtpFromEmail: household.settings?.smtpFromEmail ?? "",
        smtpFromName: household.settings?.smtpFromName ?? ""
      },
      members: household.members
        .map((member) => this.mapMember(member, options?.redactMemberEmails ?? false))
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
    };
  }

  private mapMember(
    member: Prisma.UserGetPayload<{
      include: {
        identities: true;
      };
    }>,
    redactEmail = false
  ) {
    const localIdentity = member.identities.find(
      (identity) => identity.provider === AuthProvider.LOCAL && Boolean(identity.email)
    );
    const preferredEmail = localIdentity?.email ?? member.identities.find((identity) => Boolean(identity.email))?.email;
    const authProviders = [...new Set(member.identities.map((identity) => identity.provider.toLowerCase()))];

    return {
      id: member.id,
      displayName: member.displayName,
      role: member.role.toLowerCase(),
      email: redactEmail ? null : preferredEmail ?? null,
      authProviders,
      localAuthConfigured: Boolean(localIdentity?.passwordHash),
      points: member.points,
      currentStreak: member.currentStreak
    };
  }

  private mapTemplate(
    template: Prisma.ChoreTemplateGetPayload<{
      include: { checklistItems: true; dependencies: true; variants: true };
    }>,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const dependencyRules = template.dependencies.map((dependency) => ({
      templateId: dependency.followUpTemplateId,
      delayValue: dependency.followUpDelayValue,
      delayUnit: dependency.followUpDelayUnit.toLowerCase()
    }));
    const localizedTitle = this.resolveTemplateTitle(template, language);
    const localizedDescription = this.resolveTemplateDescription(template, language);

    return {
      id: template.id,
      title: localizedTitle,
      description: localizedDescription,
      defaultLocale: this.normalizeSupportedLanguage(template.defaultLocale),
      translations: this.serializeTemplateTranslations(template),
      difficulty: template.difficulty.toLowerCase(),
      basePoints: template.basePoints,
      assignmentStrategy: this.mapAssignmentStrategy(template.assignmentStrategy),
      recurrence: {
        type: this.mapRecurrenceType(template.recurrenceType),
        intervalDays: template.recurrenceIntervalDays,
        weekdays: template.recurrenceWeekdays
      },
      requirePhotoProof: template.requirePhotoProof,
      recurrenceStartStrategy: template.recurrenceStartStrategy.toLowerCase() as "due_at" | "completed_at",
      checklist: template.checklistItems
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.title,
          required: item.required
        })),
      dependencyTemplateIds: dependencyRules.map((dependencyRule) => dependencyRule.templateId),
      dependencyRules,
      variants: template.variants
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({
          id: v.id,
          label: this.resolveVariantLabel(v, this.normalizeSupportedLanguage(template.defaultLocale), language),
          translations: this.serializeVariantTranslations(v)
        }))
    };
  }

  private mapInstance(
    instance: Prisma.ChoreInstanceGetPayload<{
      include: {
        template: { include: { checklistItems: true } };
        checklistCompletions: true;
        attachments: true;
        variant?: true;
      };
    }>,
    options?: {
      redactDetails?: boolean;
      assigneeDisplayName?: string | null;
    },
    language: SupportedLanguage = fallbackLanguage
  ) {
    const localizedTypeTitle = this.resolveTemplateTitle(instance.template, language);
    const localizedSubtypeLabel =
      this.resolveVariantLabel(
        (instance as { variant?: Prisma.ChoreTemplateVariantGetPayload<object> | null }).variant ?? null,
        this.normalizeSupportedLanguage(instance.template.defaultLocale),
        language
      ) ?? (instance as any).subtypeLabel ?? null;
    const localizedTitle = this.composeChoreTitle(localizedTypeTitle, localizedSubtypeLabel);

    if (options?.redactDetails) {
      return {
        id: instance.id,
        templateId: instance.templateId,
        title: localizedTitle,
        typeTitle: localizedTypeTitle,
        subtypeLabel: localizedSubtypeLabel,
        state: instance.state.toLowerCase(),
        assigneeId: null,
        dueAt: instance.dueAtUtc,
        difficulty: "easy" as const,
        basePoints: 0,
        requirePhotoProof: (instance as any).requirePhotoProofOverride ?? false,
        awardedPoints: 0,
        completedChecklistItems: 0,
        isOverdue:
          instance.state === ChoreState.OVERDUE ||
          ((instance.state !== ChoreState.COMPLETED && instance.state !== ChoreState.CANCELLED) &&
            instance.dueAtUtc.getTime() < Date.now()),
        attachmentCount: 0,
        overduePenaltyPoints: 0,
        completedAt: null,
        submittedAt: null,
        submittedById: null,
        submissionNote: null,
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
        variantId: (instance as any).variantId ?? null,
        checklist: [],
        checklistCompletionIds: [],
        attachments: []
      };
    }

    return {
      id: instance.id,
      templateId: instance.templateId,
      title: localizedTitle,
      typeTitle: localizedTypeTitle,
      subtypeLabel: localizedSubtypeLabel,
      state: instance.state.toLowerCase(),
      assigneeId: instance.assigneeId,
      assigneeDisplayName: options?.assigneeDisplayName ?? null,
      dueAt: instance.dueAtUtc,
      difficulty: instance.template.difficulty.toLowerCase() as "easy" | "medium" | "hard",
      basePoints: instance.template.basePoints,
      requirePhotoProof: (instance as any).requirePhotoProofOverride ?? instance.template.requirePhotoProof,
      awardedPoints: instance.awardedPoints,
      completedChecklistItems: instance.completedChecklistItems,
      isOverdue:
        instance.state === ChoreState.OVERDUE ||
        ((instance.state !== ChoreState.COMPLETED && instance.state !== ChoreState.CANCELLED) &&
          instance.dueAtUtc.getTime() < Date.now()),
      attachmentCount: instance.attachmentCount,
      overduePenaltyPoints: instance.overduePenaltyPoints,
      completedAt: instance.completedAtUtc,
      submittedAt: instance.submittedAtUtc,
      submittedById: instance.submittedById,
      submissionNote: instance.submissionNote,
      reviewedAt: instance.reviewedAtUtc,
      reviewedById: instance.reviewedById,
      reviewNote: instance.reviewNote,
      variantId: (instance as any).variantId ?? null,
      checklist: instance.template.checklistItems
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.title,
          required: item.required
        })),
      checklistCompletionIds: instance.checklistCompletions.map(
        (completion: ChoreChecklistCompletion) => completion.checklistItemId
      ),
      attachments: instance.attachments.map((attachment: ChoreAttachment) => ({
        id: attachment.id,
        clientFilename: attachment.clientFilename,
        contentType: attachment.contentType,
        storageKey: attachment.storageKey,
        createdAt: attachment.createdAtUtc
      }))
    };
  }

  private normalizeSupportedLanguage(language?: string | null): SupportedLanguage {
    const normalized = language?.trim().toLowerCase();
    return (supportedLanguages.find((entry) => entry === normalized) ?? fallbackLanguage) as SupportedLanguage;
  }

  private parseLocalizedTextMap(value: Prisma.JsonValue | null | undefined): LocalizedTextMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .map(([locale, rawValue]) => [this.normalizeSupportedLanguage(locale), typeof rawValue === "string" ? rawValue.trim() : ""] as const)
      .filter(([, text]) => text.length > 0);

    return Object.fromEntries(normalizedEntries);
  }

  private toPrismaJsonOrNull(map: LocalizedTextMap): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    const normalizedEntries = Object.entries(map).filter(([, value]) => Boolean(value?.trim()));
    if (normalizedEntries.length === 0) {
      return Prisma.JsonNull;
    }

    return Object.fromEntries(normalizedEntries.map(([locale, value]) => [locale, value!.trim()]));
  }

  private normalizeTemplateTitleTranslations(
    translations: CreateChoreTemplateDto["translations"],
    defaultLocale: SupportedLanguage,
    defaultTitle: string
  ) {
    return this.normalizeTemplateTranslationEntries(translations, "title", defaultLocale, defaultTitle);
  }

  private normalizeTemplateDescriptionTranslations(
    translations: CreateChoreTemplateDto["translations"],
    defaultLocale: SupportedLanguage,
    defaultDescription: string
  ) {
    return this.normalizeTemplateTranslationEntries(translations, "description", defaultLocale, defaultDescription);
  }

  private normalizeTemplateTranslationEntries(
    translations: CreateChoreTemplateDto["translations"],
    field: "title" | "description",
    defaultLocale: SupportedLanguage,
    defaultValue: string
  ) {
    const normalized: LocalizedTextMap = {};
    const trimmedDefaultValue = defaultValue.trim();

    for (const entry of translations ?? []) {
      const locale = this.normalizeSupportedLanguage(entry.locale);
      const value = (field === "title" ? entry.title : entry.description)?.trim();
      if (!value || locale === defaultLocale || value === trimmedDefaultValue) {
        continue;
      }
      normalized[locale] = value;
    }

    return normalized;
  }

  private normalizeVariantLabelTranslations(
    translations: LocalizedVariantTranslationInput[] | undefined,
    defaultLocale: SupportedLanguage,
    defaultLabel: string
  ) {
    const normalized: LocalizedTextMap = {};
    const trimmedDefaultLabel = defaultLabel.trim();

    for (const entry of translations ?? []) {
      const locale = this.normalizeSupportedLanguage(entry.locale);
      const value = entry.label?.trim();
      if (!value || locale === defaultLocale || value === trimmedDefaultLabel) {
        continue;
      }
      normalized[locale] = value;
    }

    return normalized;
  }

  private resolveTemplateTitle(
    template: { title: string; titleTranslations?: Prisma.JsonValue | null },
    language: SupportedLanguage
  ) {
    const translations = this.parseLocalizedTextMap(template.titleTranslations);
    return translations[language]?.trim() || template.title;
  }

  private resolveTemplateDescription(
    template: { description: string; descriptionTranslations?: Prisma.JsonValue | null },
    language: SupportedLanguage
  ) {
    const translations = this.parseLocalizedTextMap(template.descriptionTranslations);
    return translations[language]?.trim() || template.description;
  }

  private resolveVariantLabel(
    variant:
      | { label: string; labelTranslations?: Prisma.JsonValue | null }
      | null
      | undefined,
    defaultLocale: SupportedLanguage,
    language: SupportedLanguage
  ) {
    if (!variant) {
      return null;
    }

    const translations = this.parseLocalizedTextMap(variant.labelTranslations);
    if (language === defaultLocale) {
      return variant.label;
    }

    return translations[language]?.trim() || variant.label;
  }

  private serializeTemplateTranslations(
    template: {
      titleTranslations?: Prisma.JsonValue | null;
      descriptionTranslations?: Prisma.JsonValue | null;
    }
  ) {
    const titleTranslations = this.parseLocalizedTextMap(template.titleTranslations);
    const descriptionTranslations = this.parseLocalizedTextMap(template.descriptionTranslations);

    return supportedLanguages
      .map((locale) => ({
        locale,
        title: titleTranslations[locale] ?? "",
        description: descriptionTranslations[locale] ?? ""
      }))
      .filter((entry) => entry.title || entry.description);
  }

  private serializeVariantTranslations(
    variant: { labelTranslations?: Prisma.JsonValue | null }
  ) {
    const labelTranslations = this.parseLocalizedTextMap(variant.labelTranslations);

    return supportedLanguages
      .map((locale) => ({
        locale,
        label: labelTranslations[locale] ?? ""
      }))
      .filter((entry) => entry.label);
  }

  private composeChoreTitle(typeTitle: string, subtypeLabel?: string | null) {
    const normalizedSubtype = subtypeLabel?.trim();
    return normalizedSubtype ? `${typeTitle} - ${normalizedSubtype}` : typeTitle;
  }

  private mapAuditLog(
    entry: Prisma.AuditLogGetPayload<{
      include: {
        actor: true;
      };
    }>
  ) {
    return {
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: entry.createdAtUtc,
      actor: entry.actor
        ? {
            id: entry.actor.id,
            displayName: entry.actor.displayName,
            role: entry.actor.role.toLowerCase()
          }
        : null
    };
  }

  private mapPointsLedgerEntry(
    entry: Prisma.PointsLedgerEntryGetPayload<{
      include: {
        user: true;
      };
    }>
  ) {
    return {
      id: entry.id,
      userId: entry.userId,
      amount: entry.amount,
      reason: entry.reason,
      createdAt: entry.createdAtUtc,
      choreInstanceId: entry.choreInstanceId,
      user: {
        id: entry.user.id,
        displayName: entry.user.displayName,
        role: entry.user.role.toLowerCase()
      }
    };
  }

  private mapNotification(
    entry: Prisma.NotificationGetPayload<{
      include: {
        pushDeliveries: true;
      };
    }>
  ) {
    const pushSentCount = entry.pushDeliveries.filter(
      (delivery) => delivery.status === NotificationPushDeliveryStatus.SENT
    ).length;
    const pushFailedCount = entry.pushDeliveries.filter(
      (delivery) => delivery.status === NotificationPushDeliveryStatus.FAILED
    ).length;
    const pushPendingCount = entry.pushDeliveries.filter(
      (delivery) => delivery.status === NotificationPushDeliveryStatus.PENDING
    ).length;
    const pushStatus =
      entry.pushDeliveries.length === 0
        ? "not_configured"
        : pushSentCount > 0
          ? "sent"
          : pushPendingCount > 0
            ? "pending"
            : pushFailedCount > 0
              ? "failed"
              : "not_configured";

    return {
      id: entry.id,
      type: entry.type.toLowerCase(),
      title: entry.title,
      message: entry.message,
      entityType: entry.entityType,
      entityId: entry.entityId,
      isRead: entry.isRead,
      createdAt: entry.createdAtUtc,
      readAt: entry.readAtUtc,
      delivery: {
        push: {
          status: pushStatus,
          targetCount: entry.pushDeliveries.length,
          sentCount: pushSentCount,
          failedCount: pushFailedCount,
          pendingCount: pushPendingCount
        },
        email: {
          status: entry.emailDeliveryStatus.toLowerCase(),
          deliveredAt: entry.emailDeliveredAtUtc,
          attemptedAt: entry.emailLastAttemptedAtUtc,
          error: entry.emailDeliveryError
        }
      }
    };
  }

  private mapTakeoverRequest(
    request: Prisma.ChoreTakeoverRequestGetPayload<{
      include: {
        choreInstance: {
          include: {
            template: true;
            variant: true;
          };
        };
        requester: {
          select: {
            id: true;
            displayName: true;
            role: true;
          };
        };
        requested: {
          select: {
            id: true;
            displayName: true;
            role: true;
          };
        };
      };
    }>,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const localizedTypeTitle = this.resolveTemplateTitle(request.choreInstance.template, language);
    const localizedSubtypeLabel =
      this.resolveVariantLabel(
        request.choreInstance.variant,
        this.normalizeSupportedLanguage(request.choreInstance.template.defaultLocale),
        language
      ) ?? request.choreInstance.subtypeLabel ?? null;

    return {
      id: request.id,
      choreId: request.choreInstanceId,
      choreTitle: this.composeChoreTitle(localizedTypeTitle, localizedSubtypeLabel),
      status: request.status.toLowerCase(),
      note: request.note,
      createdAt: request.createdAtUtc,
      respondedAt: request.respondedAtUtc,
      requester: {
        id: request.requester.id,
        displayName: request.requester.displayName,
        role: request.requester.role.toLowerCase()
      },
      requested: {
        id: request.requested.id,
        displayName: request.requested.displayName,
        role: request.requested.role.toLowerCase()
      }
    };
  }

  private mapNotificationPreference(
    preference: Prisma.NotificationPreferenceGetPayload<object>
  ) {
    return {
      receiveAssignments: preference.receiveAssignments,
      receiveReviewUpdates: preference.receiveReviewUpdates,
      receiveDueSoonReminders: preference.receiveDueSoonReminders,
      receiveOverdueAlerts: preference.receiveOverdueAlerts,
      receiveDailySummary: preference.receiveDailySummary
    };
  }

  private mapNotificationDevice(device: Prisma.NotificationDeviceGetPayload<object>) {
    return {
      id: device.id,
      installationId: device.installationId,
      platform: device.platform.toLowerCase(),
      provider: device.provider.toLowerCase(),
      pushTokenConfigured: Boolean(device.pushToken),
      deviceName: device.deviceName,
      appVersion: device.appVersion,
      locale: device.locale,
      notificationsEnabled: device.notificationsEnabled,
      lastSeenAt: device.lastSeenAtUtc,
      createdAt: device.createdAtUtc,
      updatedAt: device.updatedAtUtc
    };
  }

  private buildDailySummaryMessage(
    dueTodayCount: number,
    overdueCount: number,
    approvalCount: number
  ) {
    const parts: string[] = [];

    if (dueTodayCount > 0) {
      parts.push(`You have ${dueTodayCount} chore${dueTodayCount === 1 ? "" : "s"} due today.`);
    }

    if (overdueCount > 0) {
      parts.push(`${overdueCount} overdue chore${overdueCount === 1 ? "" : "s"} need attention.`);
    }

    if (approvalCount > 0) {
      parts.push(
        `${approvalCount} submission${approvalCount === 1 ? " is" : "s are"} waiting for approval.`
      );
    }

    return parts.join(" ");
  }

  private async recordAuditLog(
    executor: PrismaExecutor,
    input: {
      householdId: string;
      actorUserId?: string;
      action: string;
      entityType: string;
      entityId?: string | null;
      summary: string;
    }
  ) {
    await executor.auditLog.create({
      data: {
        householdId: input.householdId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary
      }
    });
  }

  private async recordPointsLedgerEntry(
    executor: PrismaExecutor,
    input: {
      householdId: string;
      userId: string;
      choreInstanceId?: string | null;
      amount: number;
      reason: string;
    }
  ) {
    await executor.pointsLedgerEntry.create({
      data: {
        householdId: input.householdId,
        userId: input.userId,
        choreInstanceId: input.choreInstanceId ?? null,
        amount: input.amount,
        reason: input.reason
      }
    });
  }

  private async recordNotification(
    executor: PrismaExecutor,
    input: {
      householdId: string;
      recipientUserId: string;
      type: NotificationType;
      title: string;
      message: string;
      entityType?: string | null;
      entityId?: string | null;
    }
  ) {
    const shouldSendNotification = await this.shouldSendNotification(executor, input);
    if (!shouldSendNotification) {
      return false;
    }

    const emailDeliveryStatus = await this.resolveNotificationEmailDeliveryStatus(
      executor,
      input.householdId,
      input.recipientUserId
    );

    const notification = await executor.notification.create({
      data: {
        householdId: input.householdId,
        recipientUserId: input.recipientUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        emailDeliveryStatus
      }
    });

    await this.enqueuePushDeliveries(executor, notification.id, input.recipientUserId, input.type);

    return true;
  }

  private async resolveNotificationEmailDeliveryStatus(
    executor: PrismaExecutor,
    householdId: string,
    recipientUserId: string
  ) {
    const [deliverablePushDeviceCount, householdSettings, recipientIdentity] = await Promise.all([
      this.getDeliverablePushDeviceCount(executor, recipientUserId),
      executor.householdSettings.findUnique({
        where: {
          householdId
        }
      }),
      executor.authIdentity.findFirst({
        where: {
          userId: recipientUserId,
          email: {
            not: null
          }
        },
        orderBy: {
          createdAtUtc: "asc"
        }
      })
    ]);

    if (deliverablePushDeviceCount > 0) {
      return NotificationEmailDeliveryStatus.SKIPPED;
    }

    if (!householdSettings?.smtpEnabled) {
      return NotificationEmailDeliveryStatus.SKIPPED;
    }

    if (!householdSettings.smtpHost || !householdSettings.smtpPort || !householdSettings.smtpFromEmail) {
      return NotificationEmailDeliveryStatus.SKIPPED;
    }

    if (!recipientIdentity?.email) {
      return NotificationEmailDeliveryStatus.SKIPPED;
    }

    return NotificationEmailDeliveryStatus.PENDING;
  }

  private async enqueuePushDeliveries(
    executor: PrismaExecutor,
    notificationId: string,
    recipientUserId: string,
    type: NotificationType
  ) {
    const devices = await executor.notificationDevice.findMany({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId),
      orderBy: {
        updatedAtUtc: "desc"
      }
    });

    if (devices.length === 0) {
      return;
    }

    await executor.notificationPushDelivery.createMany({
      data: devices.map((device) => ({
        notificationId,
        notificationDeviceId: device.id,
        status: NotificationPushDeliveryStatus.PENDING
      })),
      skipDuplicates: true
    });

    const deviceSummary = devices.map((device) => `${device.platform.toLowerCase()}/${device.provider.toLowerCase()}`).join(", ");

    this.appLogService.log(
      `Queued push delivery for notification ${notificationId} (${type.toLowerCase()}) across ${devices.length} deliverable device(s). ${deviceSummary}`,
      "PushDelivery"
    );
  }

  private async shouldSendNotification(
    executor: PrismaExecutor,
    input: {
      recipientUserId: string;
      type: NotificationType;
    }
  ) {
    const preference = await executor.notificationPreference.findUnique({
      where: {
        userId: input.recipientUserId
      }
    });

    if (!preference) {
      return true;
    }

    switch (input.type) {
      case NotificationType.CHORE_ASSIGNED:
      case NotificationType.CHORE_TAKEOVER_REQUEST:
      case NotificationType.CHORE_TAKEOVER_APPROVED:
      case NotificationType.CHORE_TAKEOVER_DECLINED:
        return preference.receiveAssignments;
      case NotificationType.CHORE_APPROVED:
      case NotificationType.CHORE_REJECTED:
      case NotificationType.CHORE_CANCELLED:
      case NotificationType.CHORE_SUBMITTED:
        return preference.receiveReviewUpdates;
      case NotificationType.CHORE_DUE_SOON:
        return preference.receiveDueSoonReminders;
      case NotificationType.CHORE_OVERDUE:
      case NotificationType.OVERDUE_PENALTY:
        return preference.receiveOverdueAlerts;
      case NotificationType.DAILY_SUMMARY:
        return preference.receiveDailySummary;
      default:
        return true;
    }
  }

  private getDeliverablePushDeviceCount(executor: PrismaExecutor, recipientUserId: string) {
    return executor.notificationDevice.count({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId)
    });
  }

  private buildDeliverablePushDeviceWhere(recipientUserId: string): Prisma.NotificationDeviceWhereInput {
    return {
      userId: recipientUserId,
      notificationsEnabled: true,
      pushToken: {
        not: null
      },
      provider: {
        in: [NotificationDeviceProvider.FCM]
      }
    };
  }

  private async ensureUserBelongsToHousehold(householdId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        householdId
      },
      select: {
        id: true
      }
    });

    if (!user) {
      throw new NotFoundException({
        message: "That household member could not be found."
      });
    }
  }

  private mapAssignmentStrategy(strategy: AssignmentStrategyType) {
    switch (strategy) {
      case AssignmentStrategyType.ROUND_ROBIN:
        return "round_robin";
      case AssignmentStrategyType.LEAST_COMPLETED_RECENTLY:
        return "least_completed_recently";
      case AssignmentStrategyType.HIGHEST_STREAK:
        return "highest_streak";
      case AssignmentStrategyType.MANUAL_DEFAULT_ASSIGNEE:
        return "manual_default_assignee";
      default:
        return "round_robin";
    }
  }

  private mapNotificationDevicePlatform(platform?: string) {
    switch (platform) {
      case "android":
      default:
        return NotificationDevicePlatform.ANDROID;
    }
  }

  private mapNotificationDeviceProvider(provider?: string) {
    switch (provider) {
      case "fcm":
        return NotificationDeviceProvider.FCM;
      case "generic":
      default:
        return NotificationDeviceProvider.GENERIC;
    }
  }

  private mapRecurrenceType(recurrenceType: RecurrenceType) {
    switch (recurrenceType) {
      case RecurrenceType.DAILY:
        return "daily";
      case RecurrenceType.WEEKLY:
        return "weekly";
      case RecurrenceType.MONTHLY:
        return "monthly";
      case RecurrenceType.EVERY_X_DAYS:
        return "every_x_days";
      case RecurrenceType.CUSTOM_WEEKLY:
        return "custom_weekly";
      case RecurrenceType.NONE:
      default:
        return "none";
    }
  }
}
