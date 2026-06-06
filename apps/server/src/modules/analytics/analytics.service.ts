import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformSummary() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalHouseholds,
      completedOnboarding,
      choreCompletedLast7Days,
      choreCompletedLast30Days,
      rewardRedeemedLast7Days,
      rewardRedeemedLast30Days,
      pendingApproval,
      devicesByPlatform,
      householdsWithChores,
      householdsWithRewards,
      householdsWithDevices,
    ] = await Promise.all([
      this.prisma.household.count(),
      this.prisma.householdSettings.count({ where: { onboardingCompleted: true } }),
      this.prisma.choreInstance.count({ where: { completedAtUtc: { gte: sevenDaysAgo } } }),
      this.prisma.choreInstance.count({ where: { completedAtUtc: { gte: thirtyDaysAgo } } }),
      this.prisma.rewardRedemption.count({ where: { requestedAtUtc: { gte: sevenDaysAgo } } }),
      this.prisma.rewardRedemption.count({ where: { requestedAtUtc: { gte: thirtyDaysAgo } } }),
      this.prisma.choreInstance.count({
        where: { submittedAtUtc: { not: null }, completedAtUtc: null, cancelledAtUtc: null },
      }),
      this.prisma.notificationDevice.groupBy({ by: ['platform'], _count: { id: true } }),
      this.prisma.choreInstance.findMany({
        where: { completedAtUtc: { not: null } },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.rewardRedemption.findMany({
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.notificationDevice.findMany({
        select: { tenantId: true },
        distinct: ['tenantId'],
      }),
    ]);

    const byPlatform: Record<string, number> = {};
    for (const row of devicesByPlatform) {
      byPlatform[String(row.platform)] = row._count.id;
    }

    return {
      generatedAt: now.toISOString(),
      households: {
        total: totalHouseholds,
        withOnboardingCompleted: completedOnboarding,
        withAtLeastOneChoreCompleted: householdsWithChores.length,
        withRewardRedemption: householdsWithRewards.length,
        withRegisteredDevices: householdsWithDevices.length,
        byPlatform,
      },
      choreActivity: {
        completedLast7Days: choreCompletedLast7Days,
        completedLast30Days: choreCompletedLast30Days,
        pendingApproval,
      },
      rewardActivity: {
        redeemedLast7Days: rewardRedeemedLast7Days,
        redeemedLast30Days: rewardRedeemedLast30Days,
      },
    };
  }

  async getAllTenantSnapshots() {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, householdId: true } });
    if (tenants.length === 0) {
      return { generatedAt: new Date().toISOString(), tenants: [] };
    }

    const householdIds = tenants.map((t) => t.householdId);
    const tenantIds = tenants.map((t) => t.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      settingsList,
      userGroups,
      choreTemplateGroups,
      choreCompleted30dGroups,
      choreCompletedAllTimeGroups,
      lastChoreGroups,
      reward30dGroups,
      rewardAllTimeGroups,
      lastRewardGroups,
      pointsEarnedGroups,
      pointsRedeemedGroups,
      deviceCountGroups,
      devicePlatformGroups,
      approvalsHouseholds,
      proofTenants,
      takeoverHouseholds,
      masteryHouseholds,
      quickLogHouseholds,
      followUpHouseholds,
      externalHouseholds,
      deferredHouseholds,
      pendingApprovalGroups,
    ] = await Promise.all([
      this.prisma.householdSettings.findMany({
        where: { householdId: { in: householdIds } },
        select: { householdId: true, onboardingCompleted: true, onboardingAnswers: true },
      }),
      this.prisma.user.groupBy({
        by: ['householdId', 'role'],
        where: { householdId: { in: householdIds } },
        _count: { id: true },
      }),
      this.prisma.choreTemplate.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds } },
        _count: { id: true },
      }),
      this.prisma.choreInstance.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, completedAtUtc: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.choreInstance.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, completedAtUtc: { not: null } },
        _count: { id: true },
      }),
      this.prisma.choreInstance.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, completedAtUtc: { not: null } },
        _max: { completedAtUtc: true },
      }),
      this.prisma.rewardRedemption.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, requestedAtUtc: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.rewardRedemption.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds } },
        _count: { id: true },
      }),
      this.prisma.rewardRedemption.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds } },
        _max: { requestedAtUtc: true },
      }),
      this.prisma.pointsLedgerEntry.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.pointsLedgerEntry.groupBy({
        by: ['householdId'],
        where: { householdId: { in: householdIds }, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.notificationDevice.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.notificationDevice.groupBy({
        by: ['tenantId', 'platform'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId: { in: householdIds },
          submittedAtUtc: { not: null },
          completedAtUtc: null,
          cancelledAtUtc: null,
        },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreAttachment.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { tenantId: true },
        distinct: ['tenantId'],
      }),
      this.prisma.choreTakeoverRequest.findMany({
        where: { householdId: { in: householdIds } },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.userTemplateStats.findMany({
        where: { householdId: { in: householdIds }, masteryLevel: { gt: 0 } },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId: { in: householdIds },
          templateId: null,
          completedAtUtc: { not: null },
        },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreTemplate.findMany({
        where: { householdId: { in: householdIds }, dependencies: { some: {} } },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreInstance.findMany({
        where: { householdId: { in: householdIds }, completedByExternal: true },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreInstance.findMany({
        where: { householdId: { in: householdIds }, deferredReason: { not: null } },
        select: { householdId: true },
        distinct: ['householdId'],
      }),
      this.prisma.choreInstance.groupBy({
        by: ['householdId'],
        where: {
          householdId: { in: householdIds },
          submittedAtUtc: { not: null },
          completedAtUtc: null,
          cancelledAtUtc: null,
        },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    const settingsMap = new Map(settingsList.map((s) => [s.householdId, s]));
    const userMap = new Map<string, Record<string, number>>();
    for (const row of userGroups) {
      if (!userMap.has(row.householdId)) userMap.set(row.householdId, {});
      userMap.get(row.householdId)![String(row.role)] = row._count.id;
    }
    const toMap = <T extends { householdId: string }>(arr: T[]) =>
      new Map(arr.map((r) => [r.householdId, r]));
    const templateCountMap = toMap(choreTemplateGroups);
    const chore30dMap = toMap(choreCompleted30dGroups);
    const choreAllTimeMap = toMap(choreCompletedAllTimeGroups);
    const lastChoreMap = toMap(lastChoreGroups);
    const reward30dMap = toMap(reward30dGroups);
    const rewardAllTimeMap = toMap(rewardAllTimeGroups);
    const lastRewardMap = toMap(lastRewardGroups);
    const pointsEarnedMap = toMap(pointsEarnedGroups);
    const pointsRedeemedMap = toMap(pointsRedeemedGroups);
    const deviceCountMap = new Map(deviceCountGroups.map((r) => [r.tenantId, r._count.id]));
    const devicePlatformMap = new Map<string, string[]>();
    for (const row of devicePlatformGroups) {
      if (!devicePlatformMap.has(row.tenantId)) devicePlatformMap.set(row.tenantId, []);
      devicePlatformMap.get(row.tenantId)!.push(String(row.platform));
    }
    const pendingApprovalMap = toMap(pendingApprovalGroups);

    const approvalsSet = new Set(approvalsHouseholds.map((r) => r.householdId));
    const proofSet = new Set(proofTenants.map((r) => r.tenantId));
    const takeoverSet = new Set(takeoverHouseholds.map((r) => r.householdId));
    const masterySet = new Set(masteryHouseholds.map((r) => r.householdId));
    const quickLogSet = new Set(quickLogHouseholds.map((r) => r.householdId));
    const followUpSet = new Set(followUpHouseholds.map((r) => r.householdId));
    const externalSet = new Set(externalHouseholds.map((r) => r.householdId));
    const deferredSet = new Set(deferredHouseholds.map((r) => r.householdId));

    const tenantSnapshots = tenants.map((tenant) => {
      const hid = tenant.householdId;
      const tid = tenant.id;
      const settings = settingsMap.get(hid);
      const roles = userMap.get(hid) ?? {};
      const totalMembers = Object.values(roles).reduce((a, b) => a + b, 0);
      const answers = settings?.onboardingAnswers as Record<string, unknown> | null | undefined;
      const lastChore = lastChoreMap.get(hid)?._max?.completedAtUtc ?? null;
      const lastReward = lastRewardMap.get(hid)?._max?.requestedAtUtc ?? null;
      const lastActivityAt =
        lastChore && lastReward
          ? lastChore > lastReward
            ? lastChore
            : lastReward
          : lastChore ?? lastReward;

      return {
        runtimeTenantId: tid,
        memberCount: totalMembers,
        adminCount: roles['admin'] ?? 0,
        childCount: roles['child'] ?? 0,
        onboardingCompleted: settings?.onboardingCompleted ?? false,
        householdType: answers?.householdType ?? null,
        childAges: answers?.childAges ?? null,
        gamificationStyle: answers?.gamificationStyle ?? null,
        homeType: answers?.homeType ?? null,
        choreTemplateCount: templateCountMap.get(hid)?._count?.id ?? 0,
        choreCompletedCount30d: chore30dMap.get(hid)?._count?.id ?? 0,
        choreCompletedCountAllTime: choreAllTimeMap.get(hid)?._count?.id ?? 0,
        lastChoreCompletedAt: lastChore ? (lastChore as Date).toISOString() : null,
        rewardRedeemedCount30d: reward30dMap.get(hid)?._count?.id ?? 0,
        rewardRedeemedCountAllTime: rewardAllTimeMap.get(hid)?._count?.id ?? 0,
        lastRewardRedeemedAt: lastReward ? (lastReward as Date).toISOString() : null,
        lastActivityAt: lastActivityAt ? (lastActivityAt as Date).toISOString() : null,
        pointsEarnedTotal: pointsEarnedMap.get(hid)?._sum?.amount ?? 0,
        pointsRedeemedTotal: Math.abs(pointsRedeemedMap.get(hid)?._sum?.amount ?? 0),
        pendingApprovalCount: pendingApprovalMap.get(hid)?._count?.id ?? 0,
        registeredDeviceCount: deviceCountMap.get(tid) ?? 0,
        devicePlatforms: devicePlatformMap.get(tid) ?? [],
        featureUsageApproximation: {
          approvals: approvalsSet.has(hid),
          proof_uploads: proofSet.has(tid),
          takeover_requests: takeoverSet.has(hid),
          takeover_direct: takeoverSet.has(hid),
          rewards_manage: (rewardAllTimeMap.get(hid)?._count?.id ?? 0) > 0,
          mastery: masterySet.has(hid),
          quick_log: quickLogSet.has(hid),
          follow_up_automation: followUpSet.has(hid),
          external_completion: externalSet.has(hid),
          deferred_follow_up_control: deferredSet.has(hid),
          reassignment: false,
          templates_manage: (templateCountMap.get(hid)?._count?.id ?? 0) > 0,
          chores_manage: (choreAllTimeMap.get(hid)?._count?.id ?? 0) > 0,
        },
      };
    });

    return { generatedAt: new Date().toISOString(), tenants: tenantSnapshots };
  }

  async getTenantSnapshot(runtimeTenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: runtimeTenantId },
      select: { id: true, householdId: true },
    });
    if (!tenant) throw new NotFoundException({ code: 'tenant_not_found' });

    const hid = tenant.householdId;
    const tid = tenant.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      settings,
      userGroups,
      templateCount,
      chore30d,
      choreAllTime,
      lastChore,
      reward30d,
      rewardAllTime,
      lastReward,
      pointsEarned,
      pointsRedeemed,
      pointsEarned30d,
      pointsRedeemed30d,
      deviceCount,
      devicePlatforms,
      pendingApprovalCount,
      hasApprovals,
      hasProof,
      hasTakeover,
      hasMastery,
      hasQuickLog,
      hasFollowUp,
      hasExternal,
      hasDeferred,
      assignmentStrategyGroups,
    ] = await Promise.all([
      this.prisma.householdSettings.findUnique({
        where: { householdId: hid },
        select: { onboardingCompleted: true, onboardingAnswers: true },
      }),
      this.prisma.user.groupBy({ by: ['role'], where: { householdId: hid }, _count: { id: true } }),
      this.prisma.choreTemplate.count({ where: { householdId: hid } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, completedAtUtc: { gte: thirtyDaysAgo } } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, completedAtUtc: { not: null } } }),
      this.prisma.choreInstance.aggregate({ where: { householdId: hid, completedAtUtc: { not: null } }, _max: { completedAtUtc: true } }),
      this.prisma.rewardRedemption.count({ where: { householdId: hid, requestedAtUtc: { gte: thirtyDaysAgo } } }),
      this.prisma.rewardRedemption.count({ where: { householdId: hid } }),
      this.prisma.rewardRedemption.aggregate({ where: { householdId: hid }, _max: { requestedAtUtc: true } }),
      this.prisma.pointsLedgerEntry.aggregate({ where: { householdId: hid, amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.pointsLedgerEntry.aggregate({ where: { householdId: hid, amount: { lt: 0 } }, _sum: { amount: true } }),
      this.prisma.pointsLedgerEntry.aggregate({ where: { householdId: hid, amount: { gt: 0 }, createdAtUtc: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      this.prisma.pointsLedgerEntry.aggregate({ where: { householdId: hid, amount: { lt: 0 }, createdAtUtc: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      this.prisma.notificationDevice.count({ where: { tenantId: tid } }),
      this.prisma.notificationDevice.groupBy({ by: ['platform'], where: { tenantId: tid }, _count: { id: true } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, submittedAtUtc: { not: null }, completedAtUtc: null, cancelledAtUtc: null } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, submittedAtUtc: { not: null }, completedAtUtc: null, cancelledAtUtc: null } }),
      this.prisma.choreAttachment.count({ where: { tenantId: tid } }),
      this.prisma.choreTakeoverRequest.count({ where: { householdId: hid } }),
      this.prisma.userTemplateStats.count({ where: { householdId: hid, masteryLevel: { gt: 0 } } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, templateId: null, completedAtUtc: { not: null } } }),
      this.prisma.choreTemplate.count({ where: { householdId: hid, dependencies: { some: {} } } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, completedByExternal: true } }),
      this.prisma.choreInstance.count({ where: { householdId: hid, deferredReason: { not: null } } }),
      this.prisma.choreTemplate.groupBy({ by: ['assignmentStrategy'], where: { householdId: hid }, _count: { id: true } }),
    ]);

    const roles: Record<string, number> = {};
    for (const row of userGroups) roles[String(row.role)] = row._count.id;
    const totalMembers = Object.values(roles).reduce((a, b) => a + b, 0);

    const answers = settings?.onboardingAnswers as Record<string, unknown> | null | undefined;
    const lastChoreAt = lastChore._max.completedAtUtc;
    const lastRewardAt = lastReward._max.requestedAtUtc;
    const lastActivityAt =
      lastChoreAt && lastRewardAt
        ? new Date(lastChoreAt) > new Date(lastRewardAt)
          ? lastChoreAt
          : lastRewardAt
        : lastChoreAt ?? lastRewardAt;

    const platformBreakdown: Record<string, number> = {};
    for (const row of devicePlatforms) {
      platformBreakdown[String(row.platform)] = row._count.id;
    }

    const strategyBreakdown: Record<string, number> = {};
    for (const row of assignmentStrategyGroups) {
      strategyBreakdown[String(row.assignmentStrategy)] = row._count.id;
    }

    return {
      runtimeTenantId: tid,
      memberCount: totalMembers,
      adminCount: roles['admin'] ?? 0,
      childCount: roles['child'] ?? 0,
      onboardingCompleted: settings?.onboardingCompleted ?? false,
      householdType: answers?.householdType ?? null,
      childAges: answers?.childAges ?? null,
      gamificationStyle: answers?.gamificationStyle ?? null,
      homeType: answers?.homeType ?? null,
      appliances: answers?.appliances ?? null,
      choreTemplateCount: templateCount,
      choreCompletedCount30d: chore30d,
      choreCompletedCountAllTime: choreAllTime,
      lastChoreCompletedAt: lastChoreAt ? lastChoreAt.toISOString() : null,
      rewardRedeemedCount30d: reward30d,
      rewardRedeemedCountAllTime: rewardAllTime,
      lastRewardRedeemedAt: lastRewardAt ? lastRewardAt.toISOString() : null,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      pointsEarnedTotal: pointsEarned._sum.amount ?? 0,
      pointsRedeemedTotal: Math.abs(pointsRedeemed._sum.amount ?? 0),
      pointsEarned30d: pointsEarned30d._sum.amount ?? 0,
      pointsRedeemed30d: Math.abs(pointsRedeemed30d._sum.amount ?? 0),
      pendingApprovalCount,
      registeredDeviceCount: deviceCount,
      devicePlatforms: Object.keys(platformBreakdown),
      devicePlatformBreakdown: platformBreakdown,
      assignmentStrategyBreakdown: strategyBreakdown,
      featureUsageApproximation: {
        approvals: hasApprovals > 0,
        proof_uploads: hasProof > 0,
        takeover_requests: hasTakeover > 0,
        takeover_direct: hasTakeover > 0,
        rewards_manage: rewardAllTime > 0,
        mastery: hasMastery > 0,
        quick_log: hasQuickLog > 0,
        follow_up_automation: hasFollowUp > 0,
        external_completion: hasExternal > 0,
        deferred_follow_up_control: hasDeferred > 0,
        reassignment: false,
        templates_manage: templateCount > 0,
        chores_manage: choreAllTime > 0,
      },
    };
  }
}
