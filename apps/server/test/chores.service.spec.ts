import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../src/common/auth/authenticated-user.type";
import { ChoresService } from "../src/modules/chores/chores.service";

describe("ChoresService", () => {
  const user: AuthenticatedUser = {
    id: "user-1",
    tenantId: "tenant-1",
    householdId: "household-1",
    displayName: "Alex",
    role: "admin",
    email: "alex@example.com",
    points: 0,
    currentStreak: 0
  };

  let repository: {
    ensureDefaultTemplatesForHousehold: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
  };
  let featureAccessService: {
    assertEnabled: ReturnType<typeof vi.fn>;
    getFeatureAccessForTenant: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    hostedModeEnabled: boolean;
  };
  let service: ChoresService;

  beforeEach(() => {
    repository = {
      ensureDefaultTemplatesForHousehold: vi.fn().mockResolvedValue({
        seeded: true,
        templateCount: 5
      }),
      getTemplates: vi.fn().mockResolvedValue([
        {
          id: "template-1",
          groupTitle: "Kitchen",
          title: "Unload dishwasher"
        }
      ]),
      createTemplate: vi.fn().mockResolvedValue({
        id: "template-2"
      })
    };
    appConfigService = {
      hostedModeEnabled: true
    };
    featureAccessService = {
      assertEnabled: vi.fn(),
      getFeatureAccessForTenant: vi.fn().mockResolvedValue({
        templates_manage: true,
        chores_manage: true,
        reassignment: true,
        takeover_direct: true,
        takeover_requests: true,
        approvals: true,
        proof_uploads: true,
        follow_up_automation: true,
        external_completion: true,
        deferred_follow_up_control: true
      })
    };

    service = new ChoresService(
      repository as never,
      {} as never,
      {} as never,
      appConfigService as never,
      featureAccessService as never,
      {} as never,
      {} as never,
      {
        publishChoreUpdate: vi.fn()
      } as never
    );
  });

  it("seeds hosted default templates before listing templates", async () => {
    await expect(service.getTemplates(user, "en")).resolves.toEqual([
      {
        id: "template-1",
        groupTitle: "Kitchen",
        title: "Unload dishwasher"
      }
    ]);

    expect(repository.ensureDefaultTemplatesForHousehold).toHaveBeenCalledWith("household-1", "en");
    expect(repository.getTemplates).toHaveBeenCalledWith("household-1", "en");
  });

  it("does not run hosted seed flow when hosted mode is disabled", async () => {
    appConfigService.hostedModeEnabled = false;

    await service.getTemplates(user, "en");

    expect(repository.ensureDefaultTemplatesForHousehold).not.toHaveBeenCalled();
    expect(repository.getTemplates).toHaveBeenCalledWith("household-1", "en");
  });

  it("does not enforce templates_manage in the service (delegated to FeatureGuard at controller level)", async () => {
    await service.createTemplate({} as never, user, "en");

    // templates_manage is enforced by FeatureGuard at the controller level, not inside the service
    expect(featureAccessService.getFeatureAccessForTenant).not.toHaveBeenCalled();
    expect(featureAccessService.assertEnabled).not.toHaveBeenCalledWith(
      expect.anything(),
      "templates_manage"
    );
  });
});
