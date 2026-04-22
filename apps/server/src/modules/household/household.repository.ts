import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AuthProvider,
  AssignmentReasonType,
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
  RecurrenceEndMode,
  RecurrenceStartStrategy,
  RecurrenceType,
  Prisma
} from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import {
  fallbackLanguage,
  supportedLanguages,
  SupportedLanguage
} from "../../common/i18n/supported-languages";
import { AppLogService } from "../../common/logging/app-log.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";
import {
  getStarterTemplateDefinitionsByKey,
  getStarterTemplateTranslations,
  StarterTemplateDefinition
} from "../bootstrap/starter-templates.catalog";
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
type AssignmentLoad = {
  choreCount: number;
  basePoints: number;
};
type AssignmentDecision = {
  assigneeId: string | null;
  locked: boolean;
  reason: AssignmentReasonType | null;
};
type CompletionMilestone = {
  type: "perfect_day";
  userId: string;
  dayKey: string;
  completedChoreCount: number;
  messageIndex: number;
};

const assignmentFreezeWindowHours = 12;
const perfectDayAuditAction = "milestone.perfect_day";
const perfectDayBlockingStates = [
  ChoreState.OPEN,
  ChoreState.ASSIGNED,
  ChoreState.IN_PROGRESS,
  ChoreState.PENDING_APPROVAL,
  ChoreState.NEEDS_FIXES,
  ChoreState.OVERDUE
];
const activeAssignmentStates = [
  ChoreState.OPEN,
  ChoreState.ASSIGNED,
  ChoreState.IN_PROGRESS,
  ChoreState.NEEDS_FIXES,
  ChoreState.OVERDUE
] as const;
const rebalanceEligibleStates = [ChoreState.OPEN, ChoreState.ASSIGNED] as const;

@Injectable()
export class HouseholdRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appLogService: AppLogService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService
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
    selfSignupEnabled: boolean,
    starterTemplateKeys?: string[],
    language: SupportedLanguage = fallbackLanguage
  ) {
    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const normalizedHouseholdName = householdName.trim();
    const tenantId = randomUUID();
    const household = await this.prisma.$transaction(async (tx) => {
      await tx.tenant.create({
        data: {
          id: tenantId,
          slug: this.buildTenantSlug(normalizedHouseholdName, tenantId),
          displayName: normalizedHouseholdName
        }
      });

      const createdHousehold = await tx.household.create({
        data: {
          id: tenantId,
          tenantId,
          name: normalizedHouseholdName,
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
              tenantId,
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

      await this.importStarterTemplates(tx, createdHousehold.id, starterTemplateKeys, language);

      return createdHousehold;
    });

    return this.mapHousehold(household);
  }

  private async importStarterTemplates(
    tx: Prisma.TransactionClient,
    householdId: string,
    starterTemplateKeys: string[] | undefined,
    defaultLocale: SupportedLanguage
  ) {
    const starterTemplates = getStarterTemplateDefinitionsByKey(starterTemplateKeys);
    if (starterTemplates.length === 0) {
      return;
    }

    const templateIdByKey = new Map<string, string>();

    for (const template of starterTemplates) {
      const templateId = randomUUID();
      templateIdByKey.set(template.key, templateId);

      await tx.choreTemplate.create({
        data: {
          id: templateId,
          householdId,
          defaultLocale,
          groupTitle: template.groupTitle[defaultLocale],
          groupTitleTranslations: this.toPrismaJsonOrNull(
            this.mapStarterLocalizedText(template.groupTitle, defaultLocale)
          ),
          title: template.title[defaultLocale],
          titleTranslations: this.toPrismaJsonOrNull(
            this.mapStarterLocalizedText(template.title, defaultLocale)
          ),
          description: template.description[defaultLocale],
          descriptionTranslations: this.toPrismaJsonOrNull(
            this.mapStarterLocalizedText(template.description, defaultLocale)
          ),
          difficulty: template.difficulty,
          basePoints: this.getBasePoints(template.difficulty),
          assignmentStrategy: template.assignmentStrategy,
          recurrenceType: template.recurrenceType,
          recurrenceIntervalDays:
            template.recurrenceType === RecurrenceType.EVERY_X_DAYS
              ? template.recurrenceIntervalDays ?? 1
              : null,
          recurrenceWeekdays:
            template.recurrenceType === RecurrenceType.CUSTOM_WEEKLY
              ? template.recurrenceWeekdays ?? []
              : [],
          requirePhotoProof: template.requirePhotoProof,
          recurrenceStartStrategy: template.recurrenceStartStrategy,
          checklistItems: {
            create:
              template.checklist?.map((item, index) => ({
                title: item.title[defaultLocale],
                required: item.required,
                sortOrder: index + 1
              })) ?? []
          },
          variants: {
            create:
              template.variants?.map((variant, index) => ({
                label: variant.label[defaultLocale],
                labelTranslations: this.toPrismaJsonOrNull(
                  this.mapStarterLocalizedText(variant.label, defaultLocale)
                ),
                sortOrder: index + 1
              })) ?? []
          }
        }
      });
    }

    for (const template of starterTemplates) {
      const templateId = templateIdByKey.get(template.key);
      if (!templateId || !template.followUps?.length) {
        continue;
      }

      const followUps = template.followUps
        .map((followUp) => {
          const followUpTemplateId = templateIdByKey.get(followUp.key);
          if (!followUpTemplateId) {
            return null;
          }

          return {
            templateId,
            followUpTemplateId,
            followUpDelayValue: followUp.delayValue,
            followUpDelayUnit: followUp.delayUnit
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (followUps.length > 0) {
        await tx.choreTemplateDependency.createMany({
          data: followUps
        });
      }
    }
  }

  private mapStarterLocalizedText(
    value: StarterTemplateDefinition["title"],
    defaultLocale: SupportedLanguage
  ): LocalizedTextMap {
    return Object.fromEntries(
      getStarterTemplateTranslations(value, defaultLocale).map((entry) => [entry.locale, entry.text])
    );
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
        takeoverPointsDelta:
          dto.takeoverPointsDelta ?? household.settings?.takeoverPointsDelta ?? 0,
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
    const membership = await this.ensureUserBelongsToHousehold(householdId, userId);
    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        tenantId: membership.tenantId,
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
    const membership = await this.ensureUserBelongsToHousehold(householdId, userId);
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
        tenantId: membership.tenantId,
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
    const membership = await this.ensureUserBelongsToHousehold(householdId, userId);
    const devices = await this.prisma.notificationDevice.findMany({
      where: {
        tenantId: membership.tenantId,
        userId
      },
      orderBy: {
        updatedAtUtc: "desc"
      }
    });

    return devices.map((device) => this.mapNotificationDevice(device));
  }

  async getHouseholdNotificationHealth(householdId: string) {
    const tenantId = await this.getTenantIdForHousehold(this.prisma, householdId);
    const [householdSettings, members] = await Promise.all([
      this.prisma.householdSettings.findUnique({
        where: {
          householdId
        }
      }),
      this.prisma.user.findMany({
        where: {
          tenantId,
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
        (device) => this.isNotificationDevicePushReady(device)
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
    const membership = await this.ensureUserBelongsToHousehold(householdId, userId);
    const installationId = dto.installationId.trim();
    const platform = this.mapNotificationDevicePlatform(dto.platform);
    const provider = this.mapNotificationDeviceProvider(dto.provider);
    const existingDevice = await this.prisma.notificationDevice.findUnique({
      where: {
        installationId
      }
    });

    if (existingDevice && existingDevice.tenantId !== membership.tenantId) {
      throw new ForbiddenException({
        message: "That notification device already belongs to a different tenant."
      });
    }

    const notificationDevice = existingDevice
      ? await this.prisma.notificationDevice.update({
          where: {
            id: existingDevice.id
          },
          data: {
            userId,
            platform,
            provider,
            pushToken: dto.pushToken?.trim() || null,
            webPushP256dh: dto.webPushP256dh?.trim() || null,
            webPushAuth: dto.webPushAuth?.trim() || null,
            deviceName: dto.deviceName?.trim() || null,
            appVersion: dto.appVersion?.trim() || null,
            locale: dto.locale?.trim() || null,
            notificationsEnabled: dto.notificationsEnabled ?? true,
            lastSeenAtUtc: new Date()
          }
        })
      : await this.prisma.notificationDevice.create({
          data: {
            tenantId: membership.tenantId,
            userId,
            installationId,
            platform,
            provider,
            pushToken: dto.pushToken?.trim() || null,
            webPushP256dh: dto.webPushP256dh?.trim() || null,
            webPushAuth: dto.webPushAuth?.trim() || null,
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
    const membership = await this.ensureUserBelongsToHousehold(householdId, userId);
    const existingDevice = await this.prisma.notificationDevice.findFirst({
      where: {
        id: deviceId,
        tenantId: membership.tenantId,
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

  async hasDeliverablePushDevice(recipientUserId: string, tenantId: string) {
    const count = await this.prisma.notificationDevice.count({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId, tenantId)
    });

    return count > 0;
  }

  async createAdminTestNotification(input: {
    tenantId: string;
    householdId: string;
    actorUserId: string;
    actorDisplayName: string;
    recipientUserId: string;
  }) {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: input.recipientUserId,
        tenantId: input.tenantId,
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

  async getPendingPushDeliveries(take = 25, tenantId?: string) {
    const deliveries = await this.prisma.notificationPushDelivery.findMany({
      where: {
        status: NotificationPushDeliveryStatus.PENDING,
        ...(tenantId ? { tenantId } : {})
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
      tenantId: delivery.tenantId,
      householdId: delivery.notification.householdId,
      notificationId: delivery.notificationId,
      notificationDeviceId: delivery.notificationDeviceId,
      title: delivery.notification.title,
      message: delivery.notification.message,
      entityType: delivery.notification.entityType,
      entityId: delivery.notification.entityId,
      provider: delivery.notificationDevice.provider,
      pushToken: delivery.notificationDevice.pushToken,
      webPushP256dh: delivery.notificationDevice.webPushP256dh,
      webPushAuth: delivery.notificationDevice.webPushAuth,
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

  async markPushDeliverySent(deliveryId: string, tenantId: string, providerMessageId?: string | null) {
    await this.prisma.notificationPushDelivery.findFirstOrThrow({
      where: {
        id: deliveryId,
        tenantId
      },
      select: {
        id: true
      }
    });

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

  async markPushDeliveryFailed(deliveryId: string, tenantId: string, errorMessage: string) {
    await this.prisma.notificationPushDelivery.findFirstOrThrow({
      where: {
        id: deliveryId,
        tenantId
      },
      select: {
        id: true
      }
    });

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

  async retryFailedPushDelivery(tenantId: string, householdId: string, actorUserId: string, deliveryId: string) {
    const existingDelivery = await this.prisma.notificationPushDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId,
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

  async getPendingEmailNotifications(take = 25, tenantId?: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        emailDeliveryStatus: NotificationEmailDeliveryStatus.PENDING,
        ...(tenantId ? { tenantId } : {})
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
      tenantId: notification.tenantId,
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

  async markNotificationEmailSent(notificationId: string, tenantId: string) {
    await this.prisma.notification.findFirstOrThrow({
      where: {
        id: notificationId,
        tenantId
      },
      select: {
        id: true
      }
    });

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

  async markNotificationEmailFailed(notificationId: string, tenantId: string, errorMessage: string) {
    await this.prisma.notification.findFirstOrThrow({
      where: {
        id: notificationId,
        tenantId
      },
      select: {
        id: true
      }
    });

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

  async markNotificationEmailSkipped(notificationId: string, tenantId: string, reason: string) {
    await this.prisma.notification.findFirstOrThrow({
      where: {
        id: notificationId,
        tenantId
      },
      select: {
        id: true
      }
    });

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

  async retryFailedEmailDelivery(
    tenantId: string,
    householdId: string,
    actorUserId: string,
    notificationId: string
  ) {
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId,
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

  async getNotifications(tenantId: string, householdId: string, recipientUserId: string, take = 25) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId,
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

  async markNotificationRead(
    notificationId: string,
    tenantId: string,
    householdId: string,
    recipientUserId: string
  ) {
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId,
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

    return this.getNotifications(tenantId, householdId, recipientUserId);
  }

  async markAllNotificationsRead(tenantId: string, householdId: string, recipientUserId: string) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId,
        householdId,
        recipientUserId,
        isRead: false
      },
      data: {
        isRead: true,
        readAtUtc: new Date()
      }
    });

    return this.getNotifications(tenantId, householdId, recipientUserId);
  }

  async processReminderNotifications(options: {
    now: Date;
    dueSoonWindowHours: number;
    tenantIds?: string[];
  }) {
    const activeHouseholds = await this.prisma.householdSettings.findMany({
      where: {
        enablePushNotifications: true,
        ...(options.tenantIds?.length
          ? {
              household: {
                tenantId: {
                  in: options.tenantIds
                }
              }
            }
          : {})
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
    tenantIds?: string[];
  }) {
    if (!options.force && options.now.getUTCHours() !== options.summaryHourUtc) {
      return {
        createdCount: 0
      };
    }

    const activeHouseholds = await this.prisma.householdSettings.findMany({
      where: {
        enablePushNotifications: true,
        ...(options.tenantIds?.length
          ? {
              household: {
                tenantId: {
                  in: options.tenantIds
                }
              }
            }
          : {})
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

  async getNotificationEnabledTenantIds() {
    const rows = await this.prisma.householdSettings.findMany({
      where: {
        enablePushNotifications: true
      },
      select: {
        household: {
          select: {
            tenantId: true
          }
        }
      }
    });

    return [...new Set(rows.map((row) => row.household.tenantId))];
  }

  async getProofStorageUsage(tenantId: string, householdId: string) {
    const aggregate = await this.prisma.choreAttachment.aggregate({
      where: {
        tenantId,
        choreInstance: {
          householdId
        }
      },
      _sum: {
        sizeBytes: true
      }
    });

    return aggregate._sum.sizeBytes ?? 0;
  }

  async getCurrentMonthNotificationCount(tenantId: string, now = new Date()) {
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    return this.prisma.notification.count({
      where: {
        tenantId,
        createdAtUtc: {
          gte: startOfMonthUtc
        }
      }
    });
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
    const tenantId = await this.getTenantIdForHousehold(this.prisma, householdId);
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
          tenantId,
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
      orderBy: [{ groupTitle: "asc" }, { title: "asc" }]
    });

    return templates
      .map((template) => this.mapTemplate(template, language))
      .sort((left, right) => left.groupTitle.localeCompare(right.groupTitle) || left.title.localeCompare(right.title));
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
    const normalizedGroupTitle = dto.groupTitle.trim();
    const normalizedDefaultLocale = this.normalizeSupportedLanguage(dto.defaultLocale);
    const groupTitleTranslations = this.normalizeTemplateGroupTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.groupTitle
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
          id: true,
          groupTitle: true
        }
      });

      if (availableDependencies.length !== dependencyTemplateIds.length) {
        throw new NotFoundException({
          message: "One or more follow-up templates could not be found."
        });
      }

      this.ensureDependencyTemplatesShareGroup(availableDependencies, normalizedGroupTitle);
    }

    const template = await this.prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.choreTemplate.create({
        data: {
          householdId,
          defaultLocale: normalizedDefaultLocale,
          groupTitle: normalizedGroupTitle,
          groupTitleTranslations: this.toPrismaJsonOrNull(groupTitleTranslations),
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
          stickyFollowUpAssignee: dto.stickyFollowUpAssignee ?? false,
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
    const normalizedGroupTitle = dto.groupTitle.trim();
    const groupTitleTranslations = this.normalizeTemplateGroupTranslations(
      dto.translations,
      normalizedDefaultLocale,
      dto.groupTitle
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
          id: true,
          groupTitle: true
        }
      });

      if (availableDependencies.length !== dependencyTemplateIds.length) {
        throw new NotFoundException({
          message: "One or more follow-up templates could not be found."
        });
      }

      this.ensureDependencyTemplatesShareGroup(availableDependencies, normalizedGroupTitle);
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
          groupTitle: normalizedGroupTitle,
          groupTitleTranslations: this.toPrismaJsonOrNull(groupTitleTranslations),
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
          stickyFollowUpAssignee: dto.stickyFollowUpAssignee ?? false,
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
        dependencies: {
          select: {
            id: true
          }
        },
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
    const shouldTrackCycle = effectiveRecurrenceType !== RecurrenceType.NONE || template.dependencies.length > 0;
    const cycleId = shouldTrackCycle ? randomUUID() : null;
    const instanceId = randomUUID();
    const recurrenceEndSettings = this.resolveRecurrenceEndSettings(dto, effectiveRecurrenceType);
    const assignmentDecision = dto.assigneeId
      ? await this.buildManualAssignmentDecision(this.prisma, dto.assigneeId, householdId)
      : await this.resolveAssignmentDecision(
          this.prisma,
          householdId,
          template.id,
          effectiveAssignmentStrategy,
          {
            dueAt: dto.dueAt
          }
        );

    const instance = await this.prisma.$transaction(async (tx) => {
      const createdInstance = await tx.choreInstance.create({
        data: {
          id: instanceId,
          householdId,
          templateId: template.id,
          cycleId,
          occurrenceRootId: instanceId,
          subtypeLabel,
          requirePhotoProofOverride: template.requirePhotoProof,
          title: dto.title?.trim() || this.composeChoreTitle(template.title, subtypeLabel),
          state: assignmentDecision.assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          assigneeId: assignmentDecision.assigneeId,
          dueAtUtc: dto.dueAt,
          suppressRecurrence: effectiveRecurrenceType === RecurrenceType.NONE,
          variantId: dto.variantId ?? null,
          assignmentLocked: assignmentDecision.locked,
          assignmentReason: assignmentDecision.reason,
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
              : [],
          recurrenceEndModeOverride: recurrenceEndSettings.mode,
          recurrenceRemainingOccurrencesOverride: recurrenceEndSettings.remainingOccurrences,
          recurrenceEndsAtUtcOverride: recurrenceEndSettings.endsAtUtc
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

      if (assignmentDecision.assigneeId && assignmentDecision.assigneeId !== actorUserId) {
        await this.recordNotification(tx, {
          householdId,
          recipientUserId: assignmentDecision.assigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "New chore assigned",
          message: `"${createdInstance.title}" was assigned to you.`,
          entityType: "chore_instance",
          entityId: createdInstance.id
        });
      }

      return createdInstance;
    });

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId,
      excludeInstanceIds: [instance.id]
    });

    return this.mapInstance(
      await this.prisma.choreInstance.findUniqueOrThrow({
        where: {
          id: instance.id
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
      }),
      undefined,
      language
    );
  }

  async getInstances(householdId: string, language: SupportedLanguage = fallbackLanguage) {
    await this.releaseEligibleDeferredInstances(householdId);
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
    await this.releaseEligibleDeferredInstances(user.householdId);
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

  async releaseEligibleDeferredInstances(householdId: string) {
    await this.prisma.choreInstance.updateMany({
      where: {
        householdId,
        state: ChoreState.DEFERRED,
        notBeforeAtUtc: {
          lte: new Date()
        }
      },
      data: {
        state: ChoreState.OPEN,
        deferredReason: null,
        notBeforeAtUtc: null
      }
    });
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
        assigneeId: true,
        assignmentLocked: true,
        assignmentReason: true
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

    const assignmentDecision = dto.assigneeId
      ? await this.buildManualAssignmentDecision(this.prisma, dto.assigneeId, householdId)
      : dto.reassignAutomatically
        ? await this.resolveAssignmentDecision(
            this.prisma,
            householdId,
            template.id,
            template.assignmentStrategy,
            {
              currentInstanceId: instanceId,
              dueAt: dto.dueAt,
              isRebalance: true
            }
          )
        : {
            assigneeId: existingInstance.assigneeId,
            locked: existingInstance.assignmentLocked,
            reason: existingInstance.assignmentReason
          };

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
          assigneeId: assignmentDecision.assigneeId,
          state: assignmentDecision.assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          assignmentLocked: assignmentDecision.locked,
          assignmentReason: assignmentDecision.reason,
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

      if (
        assignmentDecision.assigneeId &&
        assignmentDecision.assigneeId !== existingInstance.assigneeId &&
        assignmentDecision.assigneeId !== actorUserId
      ) {
        await this.recordNotification(tx, {
          householdId,
          recipientUserId: assignmentDecision.assigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "Chore assignment updated",
          message: `"${savedInstance.title}" is now assigned to you.`,
          entityType: "chore_instance",
          entityId: savedInstance.id
        });
      }

      return savedInstance;
    });

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId,
      excludeInstanceIds: [updatedInstance.id]
    });

    return this.mapInstance(
      await this.prisma.choreInstance.findUniqueOrThrow({
        where: {
          id: updatedInstance.id
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
      }),
      undefined,
      language
    );
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
      storageKey: attachment.storageKey,
      sizeBytes: attachment.sizeBytes
    };
  }

  async startInstance(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const claimingUserId = actorUserId ?? null;
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: instanceId
      },
      data: {
        assigneeId: claimingUserId,
        state: claimingUserId ? ChoreState.ASSIGNED : ChoreState.OPEN,
        assignmentLocked: Boolean(claimingUserId),
        assignmentReason: claimingUserId ? AssignmentReasonType.CLAIMED : null
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
      summary: `Claimed chore "${updatedInstance.title}".`
    });

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId,
      excludeInstanceIds: [updatedInstance.id]
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
        state: ChoreState.ASSIGNED,
        assignmentLocked: true,
        assignmentReason: AssignmentReasonType.CLAIMED
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

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId,
      excludeInstanceIds: [updatedInstance.id]
    });

    return this.mapInstance(await this.prisma.choreInstance.findUniqueOrThrow({
      where: {
        id: updatedInstance.id
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
    }), {
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
      const householdSettings = await tx.householdSettings.findUnique({
        where: {
          householdId: input.householdId
        },
        select: {
          takeoverPointsDelta: true
        }
      });
      const takeoverPointsDelta = householdSettings?.takeoverPointsDelta ?? 0;
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

      let appliedPenalty = 0;
      if (takeoverPointsDelta < 0) {
        const requesterPoints = await tx.user.findUniqueOrThrow({
          where: {
            id: input.requesterUserId
          },
          select: {
            points: true
          }
        });

        appliedPenalty = Math.min(requesterPoints.points, Math.abs(takeoverPointsDelta));

        if (appliedPenalty > 0) {
          await tx.user.update({
            where: {
              id: input.requesterUserId
            },
            data: {
              points: {
                decrement: appliedPenalty
              }
            }
          });

          await this.recordPointsLedgerEntry(tx, {
            householdId: input.householdId,
            userId: input.requesterUserId,
            choreInstanceId: input.instanceId,
            amount: -appliedPenalty,
            reason: `Requested takeover for "${choreInstance.title}".`
          });
        }
      }

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
        summary:
          appliedPenalty > 0
            ? `Requested that "${requestedUser.displayName}" takes over chore "${choreInstance.title}" and applied ${appliedPenalty} takeover penalty points.`
            : `Requested that "${requestedUser.displayName}" takes over chore "${choreInstance.title}".`
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
      const householdSettings = await tx.householdSettings.findUnique({
        where: {
          householdId: input.householdId
        },
        select: {
          takeoverPointsDelta: true
        }
      });
      const takeoverPointsDelta = householdSettings?.takeoverPointsDelta ?? 0;
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
          state: ChoreState.ASSIGNED,
          assignmentLocked: true,
          assignmentReason: AssignmentReasonType.CLAIMED
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

      if (takeoverPointsDelta > 0) {
        await tx.user.update({
          where: {
            id: input.actingUserId
          },
          data: {
            points: {
              increment: takeoverPointsDelta
            }
          }
        });

        await this.recordPointsLedgerEntry(tx, {
          householdId: input.householdId,
          userId: input.actingUserId,
          choreInstanceId: request.choreInstanceId,
          amount: takeoverPointsDelta,
          reason: `Accepted takeover for "${request.choreInstance.title}".`
        });
      }

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
        summary:
          takeoverPointsDelta > 0
            ? `Accepted takeover request for chore "${request.choreInstance.title}" and awarded ${takeoverPointsDelta} takeover points.`
            : `Accepted takeover request for chore "${request.choreInstance.title}".`
      });

      return reassigned;
    });

    await this.rebalanceFlexibleAssignments(input.householdId, {
      actorUserId: input.actingUserId,
      excludeInstanceIds: [updatedInstance.id]
    });

    return this.mapInstance(await this.prisma.choreInstance.findUniqueOrThrow({
      where: {
        id: updatedInstance.id
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
    }), {
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
    completedByExternal?: boolean;
    externalCompleterName?: string;
    externalCompletionNote?: string;
    nextState: "pending_approval" | "completed";
    language?: SupportedLanguage;
  }) {
    const attachmentCount = input.attachments.length;
    const completedChecklistItems = input.completedChecklistItemIds.length;
    const targetState =
      input.nextState === "pending_approval" ? ChoreState.PENDING_APPROVAL : ChoreState.COMPLETED;
    const submissionResult = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.choreInstance.updateMany({
        where: {
          id: input.instanceId,
          householdId: input.householdId,
          state: {
            in: [
              ChoreState.OPEN,
              ChoreState.ASSIGNED,
              ChoreState.IN_PROGRESS,
              ChoreState.NEEDS_FIXES,
              ChoreState.OVERDUE
            ]
          }
        },
        data: {
          state: targetState,
          submittedAtUtc: new Date(),
          submittedById: input.actingUserId,
          submissionNote: input.note?.trim() || null,
          attachmentCount,
          completedChecklistItems,
          awardedPoints: input.awardedPoints,
          completedAtUtc: input.nextState === "completed" ? new Date() : null,
          completedById:
            input.nextState === "completed" && !input.completedByExternal ? input.actingUserId : null,
          completedByExternal: Boolean(input.completedByExternal && input.nextState === "completed"),
          externalCompleterName:
            input.completedByExternal && input.nextState === "completed"
              ? input.externalCompleterName?.trim() || "Outside helper"
              : null,
          externalCompletionNote:
            input.completedByExternal && input.nextState === "completed"
              ? input.externalCompletionNote?.trim() || null
              : null
        }
      });

      if (transition.count === 0) {
        const existingInstance = await tx.choreInstance.findFirstOrThrow({
          where: {
            id: input.instanceId,
            householdId: input.householdId
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

        const isDuplicateRetry =
          (input.nextState === "completed" && existingInstance.state === ChoreState.COMPLETED) ||
          (input.nextState === "pending_approval" && existingInstance.state === ChoreState.PENDING_APPROVAL);

        if (!isDuplicateRetry) {
          throw new ConflictException({
            message: "This chore can no longer be submitted from its current state."
          });
        }

        return {
          instance: existingInstance,
          didTransition: false
        };
      }

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
        const tenantId = await this.getTenantIdForHousehold(tx, input.householdId);
        await tx.choreAttachment.createMany({
          data: input.attachments.map((attachment) => ({
            tenantId,
            choreInstanceId: input.instanceId,
            submittedById: input.actingUserId,
            clientFilename: attachment.clientFilename?.trim() || "proof-image",
            contentType: attachment.contentType?.trim() || null,
            storageKey: attachment.storageKey?.trim() || null,
            sizeBytes: attachment.sizeBytes ?? 0
          }))
        });
      }

      const updatedInstance = await tx.choreInstance.findFirstOrThrow({
        where: {
          id: input.instanceId,
          householdId: input.householdId
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

      return {
        instance: updatedInstance,
        didTransition: true
      };
    });

    const updatedInstance = submissionResult.instance;
    let completionMilestone: CompletionMilestone | null = null;

    if (submissionResult.didTransition && input.nextState === "completed" && !input.completedByExternal) {
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

    if (submissionResult.didTransition && input.nextState === "pending_approval") {
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

    if (submissionResult.didTransition) {
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
    }

    if (submissionResult.didTransition && input.nextState === "completed" && !input.completedByExternal) {
      await this.rebalanceFlexibleAssignments(input.householdId, {
        actorUserId: input.actingUserId
      });
      if (updatedInstance.assigneeId) {
        completionMilestone = await this.tryCreatePerfectDayMilestone({
          householdId: input.householdId,
          userId: updatedInstance.assigneeId,
          actorUserId: input.actingUserId,
          completedInstanceId: updatedInstance.id,
          completedInstanceTitle: updatedInstance.title,
          dueAtUtc: updatedInstance.dueAtUtc
        });
      }
    }

    const mappedInstance = this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
    return completionMilestone ? { ...mappedInstance, completionMilestone } : mappedInstance;
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
    const reviewTargetState = input.approved ? ChoreState.COMPLETED : ChoreState.NEEDS_FIXES;
    const reviewResult = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.choreInstance.updateMany({
        where: {
          id: input.instanceId,
          householdId: input.householdId,
          state: ChoreState.PENDING_APPROVAL
        },
        data: {
          state: reviewTargetState,
          reviewedAtUtc: new Date(),
          reviewedById: input.actingUserId,
          reviewNote: input.note?.trim() || null,
          awardedPoints: input.approved ? input.awardedPoints : 0,
          completedAtUtc: input.approved ? new Date() : null,
          ...(input.approved ? {} : { completedById: null })
        }
      });

      if (transition.count === 0) {
        const existingInstance = await tx.choreInstance.findFirstOrThrow({
          where: {
            id: input.instanceId,
            householdId: input.householdId
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

        const isDuplicateRetry =
          (input.approved && existingInstance.state === ChoreState.COMPLETED) ||
          (!input.approved && existingInstance.state === ChoreState.NEEDS_FIXES);

        if (!isDuplicateRetry) {
          throw new ConflictException({
            message: "This chore can no longer be reviewed from its current state."
          });
        }

        return {
          instance: existingInstance,
          didTransition: false
        };
      }

      const updatedInstance = await tx.choreInstance.findFirstOrThrow({
        where: {
          id: input.instanceId,
          householdId: input.householdId
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

      return {
        instance: updatedInstance,
        didTransition: true
      };
    });

    const updatedInstance = reviewResult.instance;
    let completionMilestone: CompletionMilestone | null = null;

    if (reviewResult.didTransition && input.approved) {
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
    if (reviewResult.didTransition && reviewRecipientUserId && reviewRecipientUserId !== input.actingUserId) {
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

    if (reviewResult.didTransition) {
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
    }

    if (reviewResult.didTransition && input.approved) {
      await this.rebalanceFlexibleAssignments(input.householdId, {
        actorUserId: input.actingUserId
      });
      if (updatedInstance.assigneeId) {
        completionMilestone = await this.tryCreatePerfectDayMilestone({
          householdId: input.householdId,
          userId: updatedInstance.assigneeId,
          actorUserId: input.actingUserId,
          completedInstanceId: updatedInstance.id,
          completedInstanceTitle: updatedInstance.title,
          dueAtUtc: updatedInstance.dueAtUtc
        });
      }
    }

    const mappedInstance = this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
    return completionMilestone ? { ...mappedInstance, completionMilestone } : mappedInstance;
  }

  async releaseDeferredFollowUp(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    note?: string;
    language?: SupportedLanguage;
  }) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: input.instanceId
      },
      data: {
        state: ChoreState.OPEN,
        notBeforeAtUtc: null,
        deferredReason: input.note?.trim() || null
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
      householdId: input.householdId,
      actorUserId: input.actingUserId,
      action: "instance.released",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: `Released deferred chore "${updatedInstance.title}".`
    });

    if (updatedInstance.assigneeId && updatedInstance.assigneeId !== input.actingUserId) {
      await this.recordNotification(this.prisma, {
        householdId: input.householdId,
        recipientUserId: updatedInstance.assigneeId,
        type: NotificationType.CHORE_ASSIGNED,
        title: "Deferred chore released",
        message: `"${updatedInstance.title}" is ready to work on now.`,
        entityType: "chore_instance",
        entityId: updatedInstance.id
      });
    }

    return this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
  }

  async snoozeDeferredFollowUp(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    notBeforeAt: string;
    note?: string;
    language?: SupportedLanguage;
  }) {
    const notBeforeAtUtc = new Date(input.notBeforeAt);
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: input.instanceId
      },
      data: {
        state: ChoreState.DEFERRED,
        notBeforeAtUtc,
        deferredReason: input.note?.trim() || "Waiting for follow-up readiness."
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
      householdId: input.householdId,
      actorUserId: input.actingUserId,
      action: "instance.snoozed",
      entityType: "chore_instance",
      entityId: updatedInstance.id,
      summary: `Deferred chore "${updatedInstance.title}" until ${notBeforeAtUtc.toISOString()}.`
    });

    return this.mapInstance(updatedInstance, undefined, input.language ?? fallbackLanguage);
  }

  async cancelInstance(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const cancelledAt = new Date();
    const updatedInstance = await this.prisma.$transaction(async (tx) => {
      await tx.choreInstance.update({
        where: {
          id: instanceId
        },
        data: {
          state: ChoreState.CANCELLED,
          cancelledAtUtc: cancelledAt
        }
      });

      await tx.choreTakeoverRequest.updateMany({
        where: {
          householdId,
          choreInstanceId: instanceId,
          status: ChoreTakeoverRequestStatus.PENDING
        },
        data: {
          status: ChoreTakeoverRequestStatus.CANCELLED,
          respondedAtUtc: cancelledAt
        }
      });

      return tx.choreInstance.findFirstOrThrow({
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

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId
    });

    return this.mapInstance(updatedInstance, undefined, language);
  }

  async cancelOccurrence(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const targetInstance = await this.prisma.choreInstance.findFirstOrThrow({
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

    const effectiveRecurrence = this.getEffectiveInstanceRecurrence(targetInstance, targetInstance.template);
    const occurrenceRootId = this.getOccurrenceRootId(targetInstance);
    const supportsOccurrenceCancellation =
      Boolean(targetInstance.cycleId) &&
      effectiveRecurrence.type !== RecurrenceType.NONE &&
      occurrenceRootId === targetInstance.id;

    if (!supportsOccurrenceCancellation) {
      throw new ConflictException({
        message: "This chore does not support cancelling only one recurring occurrence."
      });
    }

    const activeOccurrenceInstances = await this.prisma.choreInstance.findMany({
      where: {
        householdId,
        occurrenceRootId,
        state: {
          notIn: [ChoreState.COMPLETED, ChoreState.CANCELLED]
        }
      },
      select: {
        id: true,
        title: true,
        assigneeId: true
      }
    });

    if (activeOccurrenceInstances.length === 0) {
      return {
        occurrenceRootId,
        cancelledCount: 0,
        cancelledIds: [],
        cancelledAt: null,
        nextInstance: null
      };
    }

    const cancelledIds = activeOccurrenceInstances.map((instance) => instance.id);
    const cancelledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.choreInstance.updateMany({
        where: {
          id: {
            in: cancelledIds
          }
        },
        data: {
          state: ChoreState.CANCELLED,
          cancelledAtUtc: cancelledAt
        }
      });

      await tx.choreTakeoverRequest.updateMany({
        where: {
          householdId,
          choreInstanceId: {
            in: cancelledIds
          },
          status: ChoreTakeoverRequestStatus.PENDING
        },
        data: {
          status: ChoreTakeoverRequestStatus.CANCELLED,
          respondedAtUtc: cancelledAt
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "occurrence.cancelled",
        entityType: "chore_occurrence",
        entityId: occurrenceRootId,
        summary: `Cancelled recurring occurrence with ${cancelledIds.length} active chore(s).`
      });

      for (const instance of activeOccurrenceInstances) {
        if (instance.assigneeId && instance.assigneeId !== actorUserId) {
          await this.recordNotification(tx, {
            householdId,
            recipientUserId: instance.assigneeId,
            type: NotificationType.CHORE_CANCELLED,
            title: "Recurring occurrence cancelled",
            message: `"${instance.title}" was cancelled for this scheduled occurrence only.`,
            entityType: "chore_instance",
            entityId: instance.id
          });
        }
      }
    });

    const nextInstance = await this.createRecurringInstance(targetInstance, {
      trigger: "cancellation"
    });

    return {
      occurrenceRootId,
      cancelledCount: cancelledIds.length,
      cancelledIds,
      cancelledAt,
      nextInstance: nextInstance ? this.mapInstance(nextInstance, undefined, language) : null
    };
  }

  async closeCycle(
    instanceId: string,
    householdId: string,
    actorUserId?: string,
    language: SupportedLanguage = fallbackLanguage
  ) {
    const targetInstance = await this.prisma.choreInstance.findFirstOrThrow({
      where: {
        id: instanceId,
        householdId
      },
      select: {
        id: true,
        cycleId: true
      }
    });

    if (!targetInstance.cycleId) {
      throw new ConflictException({
        message: "This chore is not part of a repeatable cycle."
      });
    }

    const activeCycleInstances = await this.prisma.choreInstance.findMany({
      where: {
        householdId,
        cycleId: targetInstance.cycleId,
        state: {
          notIn: [ChoreState.COMPLETED, ChoreState.CANCELLED]
        }
      },
      select: {
        id: true,
        title: true,
        assigneeId: true
      }
    });

    if (activeCycleInstances.length === 0) {
      return {
        cycleId: targetInstance.cycleId,
        cancelledCount: 0,
        cancelledIds: [],
        cancelledAt: null
      };
    }

    const cancelledIds = activeCycleInstances.map((instance) => instance.id);

    const cancelledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.choreInstance.updateMany({
        where: {
          id: {
            in: cancelledIds
          }
        },
        data: {
          state: ChoreState.CANCELLED,
          cancelledAtUtc: cancelledAt
        }
      });

      await tx.choreTakeoverRequest.updateMany({
        where: {
          householdId,
          choreInstanceId: {
            in: cancelledIds
          },
          status: ChoreTakeoverRequestStatus.PENDING
        },
        data: {
          status: ChoreTakeoverRequestStatus.CANCELLED,
          respondedAtUtc: new Date()
        }
      });

      await this.recordAuditLog(tx, {
        householdId,
        actorUserId,
        action: "cycle.closed",
        entityType: "chore_cycle",
        entityId: targetInstance.cycleId,
        summary: `Closed chore cycle with ${cancelledIds.length} active chore(s).`
      });

      for (const instance of activeCycleInstances) {
        if (instance.assigneeId && instance.assigneeId !== actorUserId) {
          await this.recordNotification(tx, {
            householdId,
            recipientUserId: instance.assigneeId,
            type: NotificationType.CHORE_CANCELLED,
            title: "Chore cycle closed",
            message: `"${instance.title}" was cancelled because its recurring cycle was closed.`,
            entityType: "chore_instance",
            entityId: instance.id
          });
        }
      }
    });

    await this.rebalanceFlexibleAssignments(householdId, {
      actorUserId
    });

    return {
      cycleId: targetInstance.cycleId,
      cancelledCount: cancelledIds.length,
      cancelledIds,
      cancelledAt
    };
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

    await this.prisma.tenant.create({
      data: {
        id: householdId,
        slug: "taskbandit-home",
        displayName: "TaskBandit Home"
      }
    });

    await this.prisma.household.create({
      data: {
        id: householdId,
        tenantId: householdId,
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
              tenantId: householdId,
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
              tenantId: householdId,
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
              tenantId: householdId,
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
              groupTitle: "Laundry",
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
              groupTitle: "Laundry",
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

  private ensureDependencyTemplatesShareGroup(
    templates: Array<{ id: string; groupTitle?: string | null }>,
    sourceGroupTitle: string
  ) {
    const normalizedSourceGroupTitle = sourceGroupTitle.trim().toLocaleLowerCase();
    const invalidTemplate = templates.find(
      (template) => template.groupTitle?.trim().toLocaleLowerCase() !== normalizedSourceGroupTitle
    );

    if (invalidTemplate) {
      throw new BadRequestException({
        message: "Follow-up chores must belong to the same group as the source template."
      });
    }
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

  private normalizeAssignmentStrategy(strategy: AssignmentStrategyType) {
    return strategy === AssignmentStrategyType.MANUAL_DEFAULT_ASSIGNEE
      ? AssignmentStrategyType.ROUND_ROBIN
      : strategy;
  }

  private assignmentReasonForStrategy(strategy: AssignmentStrategyType) {
    switch (this.normalizeAssignmentStrategy(strategy)) {
      case AssignmentStrategyType.LEAST_COMPLETED_RECENTLY:
        return AssignmentReasonType.LEAST_COMPLETED_RECENTLY;
      case AssignmentStrategyType.HIGHEST_STREAK:
        return AssignmentReasonType.HIGHEST_STREAK;
      case AssignmentStrategyType.ROUND_ROBIN:
      default:
        return AssignmentReasonType.ROUND_ROBIN;
    }
  }

  private async buildManualAssignmentDecision(
    executor: PrismaExecutor,
    assigneeId: string,
    householdId: string
  ): Promise<AssignmentDecision> {
    const validatedAssigneeId = await this.validateAssignee(executor, assigneeId, householdId);
    return {
      assigneeId: validatedAssigneeId,
      locked: true,
      reason: AssignmentReasonType.MANUAL
    };
  }

  private async resolveAssignmentDecision(
    executor: PrismaExecutor,
    householdId: string,
    templateId: string,
    strategy: AssignmentStrategyType,
    options?: {
      currentInstanceId?: string;
      stickyFollowUp?: boolean;
      isRebalance?: boolean;
      dueAt?: Date;
    }
  ): Promise<AssignmentDecision> {
    const assigneeId = await this.resolveAssigneeForTemplate(executor, householdId, templateId, strategy, {
      currentInstanceId: options?.currentInstanceId
    });

    return {
      assigneeId,
      locked: false,
      reason: assigneeId
        ? options?.stickyFollowUp
          ? AssignmentReasonType.STICKY_FOLLOW_UP
          : options?.isRebalance
            ? AssignmentReasonType.REBALANCED
            : this.assignmentReasonForStrategy(strategy)
        : null
    };
  }

  private async getActiveAssignmentLoadMap(
    executor: PrismaExecutor,
    householdId: string,
    excludingInstanceId?: string
  ) {
    const activeAssignments = await executor.choreInstance.findMany({
      where: {
        householdId,
        assigneeId: {
          not: null
        },
        state: {
          in: [...activeAssignmentStates]
        },
        ...(excludingInstanceId
          ? {
              id: {
                not: excludingInstanceId
              }
            }
          : {})
      },
      include: {
        template: {
          select: {
            basePoints: true
          }
        }
      }
    });

    const loadByUserId = new Map<string, AssignmentLoad>();
    for (const assignment of activeAssignments) {
      if (!assignment.assigneeId) {
        continue;
      }

      const currentLoad = loadByUserId.get(assignment.assigneeId) ?? {
        choreCount: 0,
        basePoints: 0
      };

      loadByUserId.set(assignment.assigneeId, {
        choreCount: currentLoad.choreCount + 1,
        basePoints: currentLoad.basePoints + assignment.template.basePoints
      });
    }

    return loadByUserId;
  }

  private compareMemberLoad(
    left: {
      id: string;
      displayName: string;
    },
    right: {
      id: string;
      displayName: string;
    },
    loadByUserId: Map<string, AssignmentLoad>
  ) {
    const leftLoad = loadByUserId.get(left.id) ?? {
      choreCount: 0,
      basePoints: 0
    };
    const rightLoad = loadByUserId.get(right.id) ?? {
      choreCount: 0,
      basePoints: 0
    };

    return (
      leftLoad.choreCount - rightLoad.choreCount ||
      leftLoad.basePoints - rightLoad.basePoints ||
      left.displayName.localeCompare(right.displayName)
    );
  }

  private async resolveAssigneeForTemplate(
    executor: PrismaExecutor,
    householdId: string,
    templateId: string,
    strategy: AssignmentStrategyType,
    options?: {
      currentInstanceId?: string;
    }
  ) {
    const members = await executor.user.findMany({
      where: {
        householdId
      },
      orderBy: [{ createdAtUtc: "asc" }, { displayName: "asc" }]
    });

    if (members.length === 0) {
      return null;
    }

    const normalizedStrategy = this.normalizeAssignmentStrategy(strategy);
    const loadByUserId = await this.getActiveAssignmentLoadMap(executor, householdId, options?.currentInstanceId);

    switch (normalizedStrategy) {
      case AssignmentStrategyType.ROUND_ROBIN: {
        const lastAssigned = await executor.choreInstance.findFirst({
          where: {
            householdId,
            templateId,
            assigneeId: {
              not: null
            },
            ...(options?.currentInstanceId
              ? {
                  id: {
                    not: options.currentInstanceId
                  }
                }
              : {})
          },
          orderBy: [{ createdAtUtc: "desc" }],
          select: {
            assigneeId: true
          }
        });

        if (!lastAssigned?.assigneeId) {
          return [...members].sort((left, right) => this.compareMemberLoad(left, right, loadByUserId))[0]?.id ?? null;
        }

        const currentIndex = members.findIndex((member) => member.id === lastAssigned.assigneeId);
        if (currentIndex < 0) {
          return [...members].sort((left, right) => this.compareMemberLoad(left, right, loadByUserId))[0]?.id ?? null;
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
            },
            ...(options?.currentInstanceId
              ? {
                  id: {
                    not: options.currentInstanceId
                  }
                }
              : {})
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

            return this.compareMemberLoad(left, right, loadByUserId);
          })[0]
          ?.id;
      }
      case AssignmentStrategyType.HIGHEST_STREAK:
        return [...members]
          .sort(
            (left, right) =>
              right.currentStreak - left.currentStreak ||
              right.points - left.points ||
              this.compareMemberLoad(left, right, loadByUserId)
          )[0]
          ?.id;
      default:
        return null;
    }
  }

  private getAssignmentFreezeCutoff() {
    return new Date(Date.now() + assignmentFreezeWindowHours * 60 * 60 * 1000);
  }

  private async rebalanceFlexibleAssignments(
    householdId: string,
    options?: {
      actorUserId?: string;
      excludeInstanceIds?: string[];
    }
  ) {
    const freezeCutoff = this.getAssignmentFreezeCutoff();
    const excludedIds = (options?.excludeInstanceIds ?? []).filter(Boolean);
    const candidates = await this.prisma.choreInstance.findMany({
      where: {
        householdId,
        state: {
          in: [...rebalanceEligibleStates]
        },
        assignmentLocked: false,
        dueAtUtc: {
          gt: freezeCutoff
        },
        ...(excludedIds.length > 0
          ? {
              id: {
                notIn: excludedIds
              }
            }
          : {})
      },
      include: {
        template: {
          select: {
            id: true,
            assignmentStrategy: true
          }
        }
      },
      orderBy: [{ dueAtUtc: "asc" }, { createdAtUtc: "asc" }]
    });

    for (const candidate of candidates) {
      const assignmentDecision = await this.resolveAssignmentDecision(
        this.prisma,
        householdId,
        candidate.template.id,
        candidate.assignmentStrategyOverride ?? candidate.template.assignmentStrategy,
        {
          currentInstanceId: candidate.id,
          isRebalance: true,
          dueAt: candidate.dueAtUtc
        }
      );
      const nextState = assignmentDecision.assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN;
      const didChange =
        candidate.assigneeId !== assignmentDecision.assigneeId ||
        candidate.state !== nextState ||
        candidate.assignmentReason !== assignmentDecision.reason;

      if (!didChange) {
        continue;
      }

      await this.prisma.choreInstance.update({
        where: {
          id: candidate.id
        },
        data: {
          assigneeId: assignmentDecision.assigneeId,
          state: nextState,
          assignmentLocked: false,
          assignmentReason: assignmentDecision.reason
        }
      });

      await this.recordAuditLog(this.prisma, {
        householdId,
        actorUserId: options?.actorUserId,
        action: "instance.rebalanced",
        entityType: "chore_instance",
        entityId: candidate.id,
        summary: `Rebalanced chore "${candidate.title}".`
      });

      if (
        assignmentDecision.assigneeId &&
        assignmentDecision.assigneeId !== candidate.assigneeId &&
        assignmentDecision.assigneeId !== options?.actorUserId
      ) {
        await this.recordNotification(this.prisma, {
          householdId,
          recipientUserId: assignmentDecision.assigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "Chore reassigned",
          message: `"${candidate.title}" was reassigned to you.`,
          entityType: "chore_instance",
          entityId: candidate.id
        });
      }
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
    const cycleId = (instance as any).cycleId ?? instance.id;
    const occurrenceRootId = this.getOccurrenceRootId(instance);

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

        const assignmentDecision =
          template.stickyFollowUpAssignee && instance.assigneeId
            ? await this.validateAssignee(tx, instance.assigneeId, instance.householdId)
                .then(
                  (assigneeId) =>
                    ({
                      assigneeId,
                      locked: false,
                      reason: AssignmentReasonType.STICKY_FOLLOW_UP
                    }) satisfies AssignmentDecision
                )
                .catch(() =>
                  this.resolveAssignmentDecision(tx, instance.householdId, template.id, template.assignmentStrategy, {
                    stickyFollowUp: true
                  })
                )
            : await this.resolveAssignmentDecision(
                tx,
                instance.householdId,
                template.id,
                template.assignmentStrategy,
                {
                  stickyFollowUp: false
                }
              );
        const matchingVariant = carriedSubtypeLabel
          ? template.variants.find(
              (entry) => entry.label.trim().toLowerCase() === carriedSubtypeLabel.trim().toLowerCase()
            ) ?? null
          : null;
        const followUpTitle = this.composeChoreTitle(template.title, carriedSubtypeLabel);
        const effectiveFollowUpRequirePhotoProof = carriedRequirePhotoProof || template.requirePhotoProof;
        const followUpState =
          followUpDueAt.getTime() > Date.now()
            ? ChoreState.DEFERRED
            : assignmentDecision.assigneeId
              ? ChoreState.ASSIGNED
              : ChoreState.OPEN;
        const notBeforeAtUtc = followUpState === ChoreState.DEFERRED ? followUpDueAt : null;

        await tx.choreInstance.create({
          data: {
            householdId: instance.householdId,
            templateId: template.id,
            cycleId,
            occurrenceRootId,
            dependencySourceInstanceId: instance.id,
            title: followUpTitle,
            subtypeLabel: carriedSubtypeLabel,
            requirePhotoProofOverride: effectiveFollowUpRequirePhotoProof,
            state: followUpState,
            assigneeId: assignmentDecision.assigneeId,
            dueAtUtc: followUpDueAt,
            notBeforeAtUtc,
            deferredReason:
              followUpState === ChoreState.DEFERRED ? "Waiting for follow-up readiness window." : null,
            variantId: matchingVariant?.id ?? null,
            assignmentLocked: assignmentDecision.locked,
            assignmentReason: assignmentDecision.reason
          }
        });

        if (assignmentDecision.assigneeId && followUpState !== ChoreState.DEFERRED) {
          await this.recordNotification(tx, {
            householdId: instance.householdId,
            recipientUserId: assignmentDecision.assigneeId,
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
    }>,
    options?: {
      trigger?: "completion" | "cancellation";
    }
  ) {
    if (instance.suppressRecurrence) {
      return null;
    }

    const template = await this.prisma.choreTemplate.findFirst({
      where: {
        id: instance.templateId,
        householdId: instance.householdId
      },
      include: { variants: true }
    });

    if (!template) {
      return null;
    }

    const effectiveAssignmentStrategy = instance.assignmentStrategyOverride ?? template.assignmentStrategy;
    const effectiveRecurrence = this.getEffectiveInstanceRecurrence(instance, template);
    const effectiveRecurrenceEndMode = (instance as any).recurrenceEndModeOverride ?? RecurrenceEndMode.NEVER;
    const remainingOccurrences = (instance as any).recurrenceRemainingOccurrencesOverride ?? null;
    const recurrenceEndsAtUtc = (instance as any).recurrenceEndsAtUtcOverride ?? null;

    if (effectiveRecurrenceEndMode === RecurrenceEndMode.AFTER_OCCURRENCES && (remainingOccurrences ?? 0) <= 0) {
      return null;
    }

    const baseDate =
      options?.trigger !== "cancellation" &&
      effectiveRecurrence.startStrategy === RecurrenceStartStrategy.COMPLETED_AT
        ? (instance.completedAtUtc ?? instance.dueAtUtc)
        : instance.dueAtUtc;

    let nextDueAt = this.calculateRecurringDueAt(
      baseDate,
      effectiveRecurrence.type,
      effectiveRecurrence.intervalDays,
      effectiveRecurrence.weekdays
    );

    if (!nextDueAt) {
      return null;
    }

    if (effectiveRecurrenceEndMode === RecurrenceEndMode.ON_DATE && recurrenceEndsAtUtc && nextDueAt > recurrenceEndsAtUtc) {
      return null;
    }

    const now = new Date();
    if (nextDueAt <= now && effectiveRecurrence.type !== RecurrenceType.NONE) {
      let attempts = 0;
      while (nextDueAt <= now && attempts < 1000) {
        const advanced = this.calculateRecurringDueAt(
          nextDueAt,
          effectiveRecurrence.type,
          effectiveRecurrence.intervalDays,
          effectiveRecurrence.weekdays
        );
        if (!advanced || advanced.getTime() === nextDueAt.getTime()) {
          break;
        }
        nextDueAt = advanced;
        attempts++;
      }
    }

    const variantId = (instance as any).variantId ?? null;
    const variant = variantId
      ? template.variants.find((v) => v.id === variantId) ?? null
      : null;
    const subtypeLabel = (instance as any).subtypeLabel ?? variant?.label ?? null;
    const requirePhotoProof =
      (instance as any).requirePhotoProofOverride ?? instance.template.requirePhotoProof;
    const instanceTitle = this.composeChoreTitle(template.title, subtypeLabel);
    const cycleId = (instance as any).cycleId ?? instance.id;
    const nextRemainingOccurrences =
      effectiveRecurrenceEndMode === RecurrenceEndMode.AFTER_OCCURRENCES && remainingOccurrences != null
        ? Math.max(remainingOccurrences - 1, 0)
        : null;
    const nextInstanceId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const assignmentDecision = await this.resolveAssignmentDecision(
        tx,
        instance.householdId,
        template.id,
        effectiveAssignmentStrategy
      );

      const createdInstance = await tx.choreInstance.create({
        data: {
          id: nextInstanceId,
          householdId: instance.householdId,
          templateId: template.id,
          cycleId,
          occurrenceRootId: nextInstanceId,
          title: instanceTitle,
          state: assignmentDecision.assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
          assigneeId: assignmentDecision.assigneeId,
          dueAtUtc: nextDueAt,
          suppressRecurrence: false,
          variantId: variantId,
          subtypeLabel,
          requirePhotoProofOverride: requirePhotoProof,
          assignmentLocked: assignmentDecision.locked,
          assignmentReason: assignmentDecision.reason,
          assignmentStrategyOverride: instance.assignmentStrategyOverride,
          recurrenceTypeOverride: instance.recurrenceTypeOverride,
          recurrenceIntervalDaysOverride: instance.recurrenceIntervalDaysOverride,
          recurrenceWeekdaysOverride: instance.recurrenceWeekdaysOverride,
          recurrenceEndModeOverride:
            effectiveRecurrenceEndMode === RecurrenceEndMode.NEVER ? null : effectiveRecurrenceEndMode,
          recurrenceRemainingOccurrencesOverride: nextRemainingOccurrences,
          recurrenceEndsAtUtcOverride: recurrenceEndsAtUtc
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

      if (assignmentDecision.assigneeId) {
        await this.recordNotification(tx, {
          householdId: instance.householdId,
          recipientUserId: assignmentDecision.assigneeId,
          type: NotificationType.CHORE_ASSIGNED,
          title: "Recurring chore assigned",
          message: `"${instanceTitle}" was scheduled again and assigned to you.`,
          entityType: "chore_template",
          entityId: template.id
        });
      }

      return createdInstance;
    });
  }

  private getOccurrenceRootId(instance: { id: string; occurrenceRootId?: string | null }) {
    return instance.occurrenceRootId ?? instance.id;
  }

  private getEffectiveInstanceRecurrence(
    instance: {
      suppressRecurrence?: boolean;
      recurrenceTypeOverride?: RecurrenceType | null;
      recurrenceIntervalDaysOverride?: number | null;
      recurrenceWeekdaysOverride?: string[];
      recurrenceStartStrategyOverride?: RecurrenceStartStrategy | null;
    },
    template: {
      recurrenceType: RecurrenceType;
      recurrenceIntervalDays: number | null;
      recurrenceWeekdays: string[];
      recurrenceStartStrategy: RecurrenceStartStrategy;
    }
  ) {
    const type =
      instance.suppressRecurrence === true
        ? RecurrenceType.NONE
        : instance.recurrenceTypeOverride ?? template.recurrenceType;

    return {
      type,
      intervalDays:
        type === RecurrenceType.EVERY_X_DAYS
          ? instance.recurrenceTypeOverride === RecurrenceType.EVERY_X_DAYS
            ? instance.recurrenceIntervalDaysOverride ?? template.recurrenceIntervalDays ?? 1
            : template.recurrenceIntervalDays ?? 1
          : null,
      weekdays:
        type === RecurrenceType.CUSTOM_WEEKLY
          ? instance.recurrenceTypeOverride === RecurrenceType.CUSTOM_WEEKLY
            ? instance.recurrenceWeekdaysOverride ?? template.recurrenceWeekdays
            : template.recurrenceWeekdays
          : [],
      startStrategy: instance.recurrenceStartStrategyOverride ?? template.recurrenceStartStrategy
    };
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

  private resolveRecurrenceEndSettings(
    dto: CreateChoreInstanceDto,
    effectiveRecurrenceType: RecurrenceType
  ) {
    if (effectiveRecurrenceType === RecurrenceType.NONE) {
      return {
        mode: null as RecurrenceEndMode | null,
        remainingOccurrences: null as number | null,
        endsAtUtc: null as Date | null
      };
    }

    const requestedMode = dto.recurrenceEndMode ?? RecurrenceEndMode.NEVER;

    if (requestedMode === RecurrenceEndMode.AFTER_OCCURRENCES) {
      if (!dto.recurrenceOccurrences) {
        throw new BadRequestException({
          message: "A repeat count is required when the recurrence ends after a set number of occurrences."
        });
      }

      return {
        mode: RecurrenceEndMode.AFTER_OCCURRENCES,
        remainingOccurrences: Math.max(dto.recurrenceOccurrences - 1, 0),
        endsAtUtc: null as Date | null
      };
    }

    if (requestedMode === RecurrenceEndMode.ON_DATE) {
      if (!dto.recurrenceEndsAt) {
        throw new BadRequestException({
          message: "An end date is required when the recurrence should stop on a specific date."
        });
      }

      if (dto.recurrenceEndsAt.getTime() <= dto.dueAt.getTime()) {
        throw new BadRequestException({
          message: "The recurrence end date must be later than the current chore due date."
        });
      }

      return {
        mode: RecurrenceEndMode.ON_DATE,
        remainingOccurrences: null as number | null,
        endsAtUtc: dto.recurrenceEndsAt
      };
    }

    return {
      mode: null as RecurrenceEndMode | null,
      remainingOccurrences: null as number | null,
      endsAtUtc: null as Date | null
    };
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
        takeoverPointsDelta: household.settings?.takeoverPointsDelta ?? 0,
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
    const localizedGroupTitle = this.resolveTemplateGroupTitle(template, language);
    const localizedTitle = this.resolveTemplateTitle(template, language);
    const localizedDescription = this.resolveTemplateDescription(template, language);

    return {
      id: template.id,
      groupTitle: localizedGroupTitle,
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
      stickyFollowUpAssignee: template.stickyFollowUpAssignee,
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

  private getUtcDayWindow(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return {
      start,
      end,
      dayKey: start.toISOString().slice(0, 10)
    };
  }

  private getMilestoneMessageIndex(seed: string, poolSize: number) {
    if (poolSize <= 1) {
      return 0;
    }

    let hash = 0;
    for (const character of seed) {
      hash = (hash * 31 + character.charCodeAt(0)) % poolSize;
    }

    return hash;
  }

  private async tryCreatePerfectDayMilestone(input: {
    householdId: string;
    userId: string;
    actorUserId: string;
    completedInstanceId: string;
    completedInstanceTitle: string;
    dueAtUtc: Date;
  }): Promise<CompletionMilestone | null> {
    const { start, end, dayKey } = this.getUtcDayWindow(input.dueAtUtc);
    const remainingBlockingChores = await this.prisma.choreInstance.count({
      where: {
        householdId: input.householdId,
        assigneeId: input.userId,
        dueAtUtc: {
          gte: start,
          lt: end
        },
        state: {
          in: perfectDayBlockingStates
        }
      }
    });

    if (remainingBlockingChores > 0) {
      return null;
    }

    const completedChoreCount = await this.prisma.choreInstance.count({
      where: {
        householdId: input.householdId,
        assigneeId: input.userId,
        dueAtUtc: {
          gte: start,
          lt: end
        },
        state: ChoreState.COMPLETED
      }
    });

    if (completedChoreCount < 1) {
      return null;
    }

    const entityId = `${input.userId}:${dayKey}`;
    const existingMilestone = await this.prisma.auditLog.findFirst({
      where: {
        householdId: input.householdId,
        action: perfectDayAuditAction,
        entityType: "user",
        entityId
      }
    });

    if (existingMilestone) {
      return null;
    }

    await this.recordAuditLog(this.prisma, {
      householdId: input.householdId,
      actorUserId: input.actorUserId,
      action: perfectDayAuditAction,
      entityType: "user",
      entityId,
      summary: `Perfect Day milestone unlocked after "${input.completedInstanceTitle}" cleared all assigned chores due on ${dayKey}.`
    });

    return {
      type: "perfect_day",
      userId: input.userId,
      dayKey,
      completedChoreCount,
      messageIndex: this.getMilestoneMessageIndex(`${entityId}:${input.completedInstanceId}`, 3)
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
    const localizedGroupTitle = this.resolveTemplateGroupTitle(instance.template, language);
    const localizedTypeTitle = this.resolveTemplateTitle(instance.template, language);
    const effectiveRecurrence = this.getEffectiveInstanceRecurrence(instance as any, instance.template);
    const occurrenceRootId = this.getOccurrenceRootId(instance as any);
    const supportsOccurrenceCancellation =
      Boolean((instance as any).cycleId) &&
      effectiveRecurrence.type !== RecurrenceType.NONE &&
      occurrenceRootId === instance.id;
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
        cycleId: (instance as any).cycleId ?? null,
        occurrenceRootId,
        groupTitle: localizedGroupTitle,
        title: localizedTitle,
        typeTitle: localizedTypeTitle,
        subtypeLabel: localizedSubtypeLabel,
        state: instance.state.toLowerCase(),
        supportsOccurrenceCancellation,
        supportsSeriesCancellation: supportsOccurrenceCancellation,
        assigneeId: null,
        assigneeDisplayName: null,
        assignmentReason: null,
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
        notBeforeAt: null,
        deferredReason: null,
        dependencySourceInstanceId: null,
        completedAt: null,
        completedByExternal: false,
        externalCompleterName: null,
        externalCompletionNote: null,
        cancelledAt: null,
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
      cycleId: (instance as any).cycleId ?? null,
      occurrenceRootId,
      groupTitle: localizedGroupTitle,
      title: localizedTitle,
      typeTitle: localizedTypeTitle,
      subtypeLabel: localizedSubtypeLabel,
      state: instance.state.toLowerCase(),
      supportsOccurrenceCancellation,
      supportsSeriesCancellation: supportsOccurrenceCancellation,
      assigneeId: instance.assigneeId,
      assigneeDisplayName: options?.assigneeDisplayName ?? null,
      assignmentReason: this.mapAssignmentReason((instance as any).assignmentReason ?? null),
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
      notBeforeAt: (instance as any).notBeforeAtUtc ?? null,
      deferredReason: (instance as any).deferredReason ?? null,
      dependencySourceInstanceId: (instance as any).dependencySourceInstanceId ?? null,
      completedAt: instance.completedAtUtc,
      completedByExternal: Boolean((instance as any).completedByExternal),
      externalCompleterName: (instance as any).externalCompleterName ?? null,
      externalCompletionNote: (instance as any).externalCompletionNote ?? null,
      cancelledAt: (instance as any).cancelledAtUtc ?? null,
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
        sizeBytes: attachment.sizeBytes,
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

  private normalizeTemplateGroupTranslations(
    translations: CreateChoreTemplateDto["translations"],
    defaultLocale: SupportedLanguage,
    defaultGroupTitle: string
  ) {
    return this.normalizeTemplateTranslationEntries(translations, "groupTitle", defaultLocale, defaultGroupTitle);
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
    field: "groupTitle" | "title" | "description",
    defaultLocale: SupportedLanguage,
    defaultValue: string
  ) {
    const normalized: LocalizedTextMap = {};
    const trimmedDefaultValue = defaultValue.trim();

    for (const entry of translations ?? []) {
      const locale = this.normalizeSupportedLanguage(entry.locale);
      const value =
        (field === "groupTitle"
          ? entry.groupTitle
          : field === "title"
            ? entry.title
            : entry.description)?.trim();
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

  private resolveTemplateGroupTitle(
    template: { groupTitle: string; groupTitleTranslations?: Prisma.JsonValue | null },
    language: SupportedLanguage
  ) {
    const translations = this.parseLocalizedTextMap(template.groupTitleTranslations);
    return translations[language]?.trim() || template.groupTitle;
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
      groupTitleTranslations?: Prisma.JsonValue | null;
      titleTranslations?: Prisma.JsonValue | null;
      descriptionTranslations?: Prisma.JsonValue | null;
    }
  ) {
    const groupTitleTranslations = this.parseLocalizedTextMap(template.groupTitleTranslations);
    const titleTranslations = this.parseLocalizedTextMap(template.titleTranslations);
    const descriptionTranslations = this.parseLocalizedTextMap(template.descriptionTranslations);

    return supportedLanguages
      .map((locale) => ({
        locale,
        groupTitle: groupTitleTranslations[locale] ?? "",
        title: titleTranslations[locale] ?? "",
        description: descriptionTranslations[locale] ?? ""
      }))
      .filter((entry) => entry.groupTitle || entry.title || entry.description);
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
      pushTokenConfigured: this.isNotificationDevicePushReady(device),
      deviceName: device.deviceName,
      appVersion: device.appVersion,
      locale: device.locale,
      notificationsEnabled: device.notificationsEnabled,
      lastSeenAt: device.lastSeenAtUtc,
      createdAt: device.createdAtUtc,
      updatedAt: device.updatedAtUtc
    };
  }

  private isNotificationDevicePushReady(
    device: Pick<
      Prisma.NotificationDeviceGetPayload<object>,
      "notificationsEnabled" | "provider" | "pushToken" | "webPushP256dh" | "webPushAuth"
    >
  ) {
    if (!device.notificationsEnabled) {
      return false;
    }

    switch (device.provider) {
      case NotificationDeviceProvider.FCM:
        return Boolean(device.pushToken);
      case NotificationDeviceProvider.WEB_PUSH:
        return Boolean(device.pushToken && device.webPushP256dh && device.webPushAuth);
      case NotificationDeviceProvider.GENERIC:
      default:
        return false;
    }
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
    const tenantId = await this.getTenantIdForHousehold(executor, input.householdId);
    await executor.auditLog.create({
      data: {
        tenantId,
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
    const tenantId = await this.getTenantIdForHousehold(executor, input.householdId);
    await executor.pointsLedgerEntry.create({
      data: {
        tenantId,
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

    const tenantId = await this.getTenantIdForHousehold(executor, input.householdId);
    await this.tenantRuntimePolicyService.assertActionAllowed(tenantId, "notification_enqueue");
    await this.tenantRuntimePolicyService.assertMonthlyNotificationLimit(
      tenantId,
      await this.getCurrentMonthNotificationCount(tenantId),
      1
    );
    const emailDeliveryStatus = await this.resolveNotificationEmailDeliveryStatus(
      executor,
      tenantId,
      input.householdId,
      input.recipientUserId
    );

    const notification = await executor.notification.create({
      data: {
        tenantId,
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
    tenantId: string,
    householdId: string,
    recipientUserId: string
  ) {
    const [deliverablePushDeviceCount, householdSettings, recipientIdentity] = await Promise.all([
      this.getDeliverablePushDeviceCount(executor, recipientUserId, tenantId),
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
    const notification = await executor.notification.findUniqueOrThrow({
      where: {
        id: notificationId
      },
      select: {
        tenantId: true
      }
    });
    const devices = await executor.notificationDevice.findMany({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId, notification.tenantId),
      orderBy: {
        updatedAtUtc: "desc"
      }
    });

    if (devices.length === 0) {
      return;
    }

    await executor.notificationPushDelivery.createMany({
      data: devices.map((device) => ({
        tenantId: device.tenantId,
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

  private getDeliverablePushDeviceCount(
    executor: PrismaExecutor,
    recipientUserId: string,
    tenantId: string
  ) {
    return executor.notificationDevice.count({
      where: this.buildDeliverablePushDeviceWhere(recipientUserId, tenantId)
    });
  }

  private buildDeliverablePushDeviceWhere(
    recipientUserId: string,
    tenantId?: string
  ): Prisma.NotificationDeviceWhereInput {
    return {
      ...(tenantId ? { tenantId } : {}),
      userId: recipientUserId,
      notificationsEnabled: true,
      OR: [
        {
          provider: NotificationDeviceProvider.FCM,
          pushToken: {
            not: null
          }
        },
        {
          provider: NotificationDeviceProvider.WEB_PUSH,
          pushToken: {
            not: null
          },
          webPushP256dh: {
            not: null
          },
          webPushAuth: {
            not: null
          }
        }
      ]
    };
  }

  private async ensureUserBelongsToHousehold(householdId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        householdId
      },
      select: {
        id: true,
        tenantId: true
      }
    });

    if (!user) {
      throw new NotFoundException({
        message: "That household member could not be found."
      });
    }

    return user;
  }

  private async getTenantIdForHousehold(executor: PrismaExecutor, householdId: string) {
    const household = await executor.household.findUnique({
      where: {
        id: householdId
      },
      select: {
        tenantId: true
      }
    });

    if (!household) {
      throw new NotFoundException({
        message: "That household could not be found."
      });
    }

    return household.tenantId;
  }

  private buildTenantSlug(name: string, fallbackId: string) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || fallbackId.toLowerCase();
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
        return "round_robin";
      default:
        return "round_robin";
    }
  }

  private mapAssignmentReason(reason: AssignmentReasonType | null) {
    switch (reason) {
      case AssignmentReasonType.ROUND_ROBIN:
        return "round_robin";
      case AssignmentReasonType.LEAST_COMPLETED_RECENTLY:
        return "least_completed_recently";
      case AssignmentReasonType.HIGHEST_STREAK:
        return "highest_streak";
      case AssignmentReasonType.MANUAL:
        return "manual";
      case AssignmentReasonType.CLAIMED:
        return "claimed";
      case AssignmentReasonType.STICKY_FOLLOW_UP:
        return "sticky_follow_up";
      case AssignmentReasonType.REBALANCED:
        return "rebalanced";
      default:
        return null;
    }
  }

  private mapNotificationDevicePlatform(platform?: string) {
    switch (platform) {
      case "web":
        return NotificationDevicePlatform.WEB;
      case "android":
      default:
        return NotificationDevicePlatform.ANDROID;
    }
  }

  private mapNotificationDeviceProvider(provider?: string) {
    switch (provider) {
      case "web_push":
        return NotificationDeviceProvider.WEB_PUSH;
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
