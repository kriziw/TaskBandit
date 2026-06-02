import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChoreState,
  HolidayExistingMode,
  NotificationDeviceProvider,
  NotificationEmailDeliveryStatus,
  NotificationPushDeliveryStatus,
  NotificationType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateHolidayBlockDto } from './dto/create-holiday-block.dto';

// ── Timezone helpers ──────────────────────────────────────────────────────────

function toLocalDateString(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}

function toLocalYesterday(date: Date, timezone: string): string {
  const yesterday = new Date(date);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return toLocalDateString(yesterday, timezone);
}

/** Parse a YYYY-MM-DD string to a UTC midnight Date for Prisma DATE comparisons. */
function parseDateString(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Return YYYY-MM-DD from a Prisma DATE value (UTC midnight). */
function blockDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── States affected by DEFER mode ─────────────────────────────────────────────

const DEFERRABLE_STATES: ChoreState[] = [
  ChoreState.OPEN,
  ChoreState.ASSIGNED,
  ChoreState.IN_PROGRESS,
  ChoreState.DEFERRED,
];

// ── Repository ────────────────────────────────────────────────────────────────

@Injectable()
export class HolidayBlocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createBlock(dto: CreateHolidayBlockDto, householdId: string, userId: string) {
    const settings = await this.prisma.householdSettings.findUnique({
      where: { householdId },
      select: { timezone: true },
    });
    const tz = settings?.timezone ?? 'UTC';
    const todayStr = toLocalDateString(new Date(), tz);

    if (dto.startDate < todayStr) {
      throw new ConflictException({ message: 'Holiday block start date cannot be in the past.' });
    }
    if (dto.endDate <= dto.startDate) {
      throw new ConflictException({ message: 'End date must be after start date.' });
    }

    const start = parseDateString(dto.startDate);
    const end = parseDateString(dto.endDate);

    const overlap = await this.prisma.householdHolidayBlock.findFirst({
      where: {
        householdId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });
    if (overlap) {
      throw new ConflictException({
        message: 'A holiday block already exists for this date range.',
        code: 'holiday_block_overlap',
      });
    }

    const block = await this.prisma.householdHolidayBlock.create({
      data: {
        householdId,
        name: dto.name.trim(),
        startDate: start,
        endDate: end,
        existingMode: dto.existingMode,
        createdBy: userId,
      },
    });

    return this.mapBlock(block, todayStr);
  }

  async listBlocks(householdId: string) {
    const settings = await this.prisma.householdSettings.findUnique({
      where: { householdId },
      select: { timezone: true },
    });
    const tz = settings?.timezone ?? 'UTC';
    const todayStr = toLocalDateString(new Date(), tz);

    const blocks = await this.prisma.householdHolidayBlock.findMany({
      where: { householdId },
      orderBy: { startDate: 'desc' },
    });

    return blocks.map((b) => this.mapBlock(b, todayStr));
  }

  async deleteBlock(id: string, householdId: string) {
    const block = await this.prisma.householdHolidayBlock.findFirst({
      where: { id, householdId },
    });
    if (!block) throw new NotFoundException({ message: 'Holiday block not found.' });
    if (block.appliedAt !== null) {
      throw new ConflictException({
        message: 'Cannot delete a holiday block that has already started.',
        code: 'holiday_block_already_started',
      });
    }
    await this.prisma.householdHolidayBlock.delete({ where: { id } });
  }

  async endBlockEarly(id: string, householdId: string) {
    const settings = await this.prisma.householdSettings.findUnique({
      where: { householdId },
      select: { timezone: true },
    });
    const tz = settings?.timezone ?? 'UTC';
    const todayStr = toLocalDateString(new Date(), tz);

    const block = await this.prisma.householdHolidayBlock.findFirst({
      where: { id, householdId },
    });
    if (!block) throw new NotFoundException({ message: 'Holiday block not found.' });

    const startStr = blockDateString(block.startDate);
    const endStr = blockDateString(block.endDate);
    const isActive = block.appliedAt !== null && startStr <= todayStr && endStr >= todayStr;

    if (!isActive) {
      throw new ConflictException({
        message: 'Can only end a currently active holiday block early.',
        code: 'holiday_block_not_active',
      });
    }

    const updated = await this.prisma.householdHolidayBlock.update({
      where: { id },
      data: { endDate: parseDateString(todayStr) },
    });

    return this.mapBlock(updated, todayStr);
  }

  // ── Active block query (used by guards) ────────────────────────────────────

  async getActiveBlockForHousehold(householdId: string) {
    const now = new Date();
    // ±1 day UTC window covers every IANA timezone offset (max ±14 h).
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(now);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const block = await this.prisma.householdHolidayBlock.findFirst({
      where: {
        householdId,
        startDate: { lte: windowEnd },
        endDate: { gte: windowStart },
        appliedAt: { not: null },
      },
      orderBy: { startDate: 'asc' },
    });

    return block ?? null;
  }

  // ── Worker: block-start processing ─────────────────────────────────────────

  /**
   * Processes all holiday blocks whose start date is today (in each household's
   * local timezone). Intentionally runs for ALL tenants — self-hosted and SaaS
   * alike — so DEFER mode fires even when push notifications are disabled.
   * Notifications are sent only for tenants in notificationTenantIds.
   */
  async processBlockStart(options: { now: Date; notificationTenantIds: string[] }) {
    const windowStart = new Date(options.now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(options.now);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const candidates = await this.prisma.householdHolidayBlock.findMany({
      where: {
        appliedAt: null,
        startDate: { gte: windowStart, lte: windowEnd },
      },
      include: {
        household: {
          select: {
            tenantId: true,
            settings: { select: { timezone: true } },
          },
        },
      },
    });

    let processedCount = 0;

    for (const block of candidates) {
      const tz = block.household.settings?.timezone ?? 'UTC';
      const localToday = toLocalDateString(options.now, tz);
      if (blockDateString(block.startDate) !== localToday) continue;

      // DEFER mode: shift dueAt for open instances within the block window.
      if (block.existingMode === HolidayExistingMode.DEFER) {
        const endDateStr = blockDateString(block.endDate);
        const dayAfterBlock = parseDateString(endDateStr);
        dayAfterBlock.setUTCDate(dayAfterBlock.getUTCDate() + 1);

        await this.prisma.choreInstance.updateMany({
          where: {
            householdId: block.householdId,
            state: { in: DEFERRABLE_STATES },
            dueAtUtc: {
              gte: parseDateString(localToday),
              lte: new Date(parseDateString(endDateStr).getTime() + 86_400_000 - 1),
            },
          },
          data: { dueAtUtc: dayAfterBlock },
        });
      }

      await this.prisma.householdHolidayBlock.update({
        where: { id: block.id },
        data: { appliedAt: options.now },
      });

      if (options.notificationTenantIds.includes(block.household.tenantId)) {
        await this.notifyAllMembers(block.householdId, block.household.tenantId, {
          type: NotificationType.HOLIDAY_BLOCK_STARTED,
          title: 'Holiday mode started',
          message: `🏖️ Holiday mode started: ${block.name}. Chore scheduling is paused until ${blockDateString(block.endDate)}.`,
          entityType: 'holiday_block',
          entityId: block.id,
        });
      }

      processedCount++;
    }

    return { processedCount };
  }

  // ── Worker: block-end processing ───────────────────────────────────────────

  /**
   * Fires HOLIDAY_BLOCK_ENDED notifications for blocks that ended yesterday
   * (household local time). Also runs for all tenants; notification gating is
   * handled via notificationTenantIds.
   */
  async processBlockEnd(options: { now: Date; notificationTenantIds: string[] }) {
    const windowStart = new Date(options.now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 2);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(options.now);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const candidates = await this.prisma.householdHolidayBlock.findMany({
      where: {
        appliedAt: { not: null },
        endDate: { gte: windowStart, lte: windowEnd },
      },
      include: {
        household: {
          select: {
            tenantId: true,
            settings: { select: { timezone: true } },
          },
        },
      },
    });

    let processedCount = 0;

    for (const block of candidates) {
      const tz = block.household.settings?.timezone ?? 'UTC';
      const localYesterday = toLocalYesterday(options.now, tz);
      if (blockDateString(block.endDate) !== localYesterday) continue;

      if (!options.notificationTenantIds.includes(block.household.tenantId)) {
        processedCount++;
        continue;
      }

      // Idempotency: skip if the ended notification was already sent.
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          entityType: 'holiday_block',
          entityId: block.id,
          type: NotificationType.HOLIDAY_BLOCK_ENDED,
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      await this.notifyAllMembers(block.householdId, block.household.tenantId, {
        type: NotificationType.HOLIDAY_BLOCK_ENDED,
        title: 'Holiday mode ended',
        message: `👋 Holiday mode ended: ${block.name}. Chore scheduling has resumed.`,
        entityType: 'holiday_block',
        entityId: block.id,
      });

      processedCount++;
    }

    return { processedCount };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async notifyAllMembers(
    householdId: string,
    tenantId: string,
    payload: {
      type: NotificationType;
      title: string;
      message: string;
      entityType: string;
      entityId: string;
    },
  ) {
    const members = await this.prisma.user.findMany({
      where: { householdId },
      select: { id: true },
    });

    for (const member of members) {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          householdId,
          recipientUserId: member.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          entityType: payload.entityType,
          entityId: payload.entityId,
          emailDeliveryStatus: NotificationEmailDeliveryStatus.SKIPPED,
          isRead: false,
        },
      });

      const devices = await this.prisma.notificationDevice.findMany({
        where: {
          tenantId,
          userId: member.id,
          notificationsEnabled: true,
          OR: [
            { provider: NotificationDeviceProvider.FCM, pushToken: { not: null } },
            {
              provider: NotificationDeviceProvider.WEB_PUSH,
              pushToken: { not: null },
              webPushP256dh: { not: null },
              webPushAuth: { not: null },
            },
          ],
        },
      });

      if (devices.length > 0) {
        await this.prisma.notificationPushDelivery.createMany({
          data: devices.map((device) => ({
            tenantId: device.tenantId,
            notificationId: notification.id,
            notificationDeviceId: device.id,
            status: NotificationPushDeliveryStatus.PENDING,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  private mapBlock(
    block: {
      id: string;
      householdId: string;
      name: string;
      startDate: Date;
      endDate: Date;
      existingMode: HolidayExistingMode;
      createdBy: string;
      appliedAt: Date | null;
      createdAt: Date;
    },
    todayStr: string,
  ) {
    const startStr = blockDateString(block.startDate);
    const endStr = blockDateString(block.endDate);

    let status: 'upcoming' | 'active' | 'past';
    if (endStr < todayStr) {
      status = 'past';
    } else if (startStr <= todayStr && block.appliedAt !== null) {
      status = 'active';
    } else {
      status = 'upcoming';
    }

    return {
      id: block.id,
      householdId: block.householdId,
      name: block.name,
      startDate: startStr,
      endDate: endStr,
      existingMode: block.existingMode,
      createdBy: block.createdBy,
      appliedAt: block.appliedAt?.toISOString() ?? null,
      createdAt: block.createdAt.toISOString(),
      status,
    };
  }
}
