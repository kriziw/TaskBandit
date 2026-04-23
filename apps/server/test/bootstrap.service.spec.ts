import { ConflictException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BootstrapService } from "../src/modules/bootstrap/bootstrap.service";

describe("BootstrapService", () => {
  let repository: {
    seedDemoDataIfNeeded: ReturnType<typeof vi.fn>;
    getBootstrapStatus: ReturnType<typeof vi.fn>;
    bootstrapHousehold: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    hostedModeEnabled: boolean;
    seedDemoData: boolean;
  };
  let authService: {
    hashPassword: ReturnType<typeof vi.fn>;
  };
  let service: BootstrapService;

  beforeEach(() => {
    repository = {
      seedDemoDataIfNeeded: vi.fn().mockResolvedValue(undefined),
      getBootstrapStatus: vi.fn().mockResolvedValue({
        isBootstrapped: false,
        householdCount: 0
      }),
      bootstrapHousehold: vi.fn().mockResolvedValue({
        id: "household-1"
      })
    };
    appConfigService = {
      hostedModeEnabled: false,
      seedDemoData: false
    };
    authService = {
      hashPassword: vi.fn().mockResolvedValue("hashed-password")
    };

    service = new BootstrapService(
      repository as never,
      appConfigService as never,
      {
        translate: (key: string) =>
          ({
            "bootstrap.already_initialized": "Bootstrap already completed."
          })[key] ?? key
      } as never,
      authService as never
    );
  });

  it("delegates bootstrap status to the repository for self-hosted runtimes", async () => {
    await expect(service.getStatus()).resolves.toEqual({
      isBootstrapped: false,
      householdCount: 0
    });

    expect(repository.getBootstrapStatus).toHaveBeenCalledTimes(1);
  });

  it("reports hosted runtimes as already bootstrapped", async () => {
    appConfigService.hostedModeEnabled = true;

    await expect(service.getStatus()).resolves.toEqual({
      isBootstrapped: true,
      householdCount: 1
    });

    expect(repository.getBootstrapStatus).not.toHaveBeenCalled();
  });

  it("hides starter templates in hosted mode", () => {
    appConfigService.hostedModeEnabled = true;

    expect(service.getStarterTemplateOptions("en")).toEqual([]);
  });

  it("rejects manual bootstrap in hosted mode", async () => {
    appConfigService.hostedModeEnabled = true;

    await expect(
      service.bootstrapHousehold(
        {
          householdName: "TaskBandit Home",
          ownerDisplayName: "Alex",
          ownerEmail: "alex@example.com",
          ownerPassword: "Password123!",
          selfSignupEnabled: false,
          starterTemplateKeys: []
        },
        "en"
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(authService.hashPassword).not.toHaveBeenCalled();
    expect(repository.bootstrapHousehold).not.toHaveBeenCalled();
  });

  it("blocks duplicate bootstrap in self-hosted mode", async () => {
    repository.getBootstrapStatus.mockResolvedValue({
      isBootstrapped: true,
      householdCount: 1
    });

    await expect(
      service.bootstrapHousehold(
        {
          householdName: "TaskBandit Home",
          ownerDisplayName: "Alex",
          ownerEmail: "alex@example.com",
          ownerPassword: "Password123!",
          selfSignupEnabled: false,
          starterTemplateKeys: []
        },
        "en"
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(authService.hashPassword).not.toHaveBeenCalled();
    expect(repository.bootstrapHousehold).not.toHaveBeenCalled();
  });
});
