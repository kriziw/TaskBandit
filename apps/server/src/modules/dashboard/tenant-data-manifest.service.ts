import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";

type TenantManifestRecord = {
  id: string;
};

type TenantAttachmentManifestRecord = {
  id: string;
  storageKey: string | null;
  sizeBytes: number;
};

type TenantNotificationPreferenceManifestRecord = {
  userId: string;
};

@Injectable()
export class TenantDataManifestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService
  ) {}

  async buildExportManifest(user: AuthenticatedUser) {
    return this.buildManifest("export", user);
  }

  async buildDeletionManifest(user: AuthenticatedUser) {
    return this.buildManifest("deletion", user);
  }

  private async buildManifest(kind: "export" | "deletion", user: AuthenticatedUser) {
    const [
      tenantAccess,
      users,
      templates,
      instances,
      attachments,
      auditLogs,
      pointsLedgerEntries,
      notifications,
      notificationPreferences,
      notificationDevices,
      notificationPushDeliveries
    ] = await Promise.all([
      this.tenantRuntimePolicyService.getTenantAccessState(user.tenantId),
      this.listIds(this.prisma.user.findMany({
        where: {
          tenantId: user.tenantId,
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.listIds(this.prisma.choreTemplate.findMany({
        where: {
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.listIds(this.prisma.choreInstance.findMany({
        where: {
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.prisma.choreAttachment.findMany({
        where: {
          tenantId: user.tenantId,
          choreInstance: {
            householdId: user.householdId
          }
        },
        select: {
          id: true,
          storageKey: true,
          sizeBytes: true
        },
        orderBy: {
          createdAtUtc: "asc"
        }
      }),
      this.listIds(this.prisma.auditLog.findMany({
        where: {
          tenantId: user.tenantId,
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.listIds(this.prisma.pointsLedgerEntry.findMany({
        where: {
          tenantId: user.tenantId,
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.listIds(this.prisma.notification.findMany({
        where: {
          tenantId: user.tenantId,
          householdId: user.householdId
        },
        select: {
          id: true
        }
      })),
      this.listNotificationPreferenceIds(this.prisma.notificationPreference.findMany({
        where: {
          tenantId: user.tenantId,
          user: {
            householdId: user.householdId
          }
        },
        select: {
          userId: true
        }
      })),
      this.listIds(this.prisma.notificationDevice.findMany({
        where: {
          tenantId: user.tenantId,
          user: {
            householdId: user.householdId
          }
        },
        select: {
          id: true
        }
      })),
      this.listIds(this.prisma.notificationPushDelivery.findMany({
        where: {
          tenantId: user.tenantId,
          notification: {
            householdId: user.householdId
          }
        },
        select: {
          id: true
        }
      }))
    ]);

    const proofObjects = attachments
      .filter((attachment) => Boolean(attachment.storageKey))
      .map((attachment) => ({
        attachmentId: attachment.id,
        storageKey: attachment.storageKey!,
        sizeBytes: attachment.sizeBytes
      }));

    return {
      manifestType: kind,
      exportVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      tenant: {
        tenantId: user.tenantId,
        householdId: user.householdId,
        runtime: tenantAccess
      },
      databaseInventory: {
        users,
        choreTemplates: templates,
        choreInstances: instances,
        choreAttachments: attachments.map((attachment) => attachment.id),
        auditLogs,
        pointsLedgerEntries,
        notifications,
        notificationPreferences,
        notificationDevices,
        notificationPushDeliveries
      },
      objectInventory: {
        proofObjects,
        totalProofObjectCount: proofObjects.length,
        totalProofBytes: proofObjects.reduce((sum, entry) => sum + entry.sizeBytes, 0)
      }
    };
  }

  private async listIds(query: Promise<TenantManifestRecord[]>) {
    const rows = await query;
    return rows.map((row) => row.id);
  }

  private async listNotificationPreferenceIds(
    query: Promise<TenantNotificationPreferenceManifestRecord[]>
  ) {
    const rows = await query;
    return rows.map((row) => row.userId);
  }
}
