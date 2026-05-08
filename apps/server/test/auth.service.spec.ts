import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuthProvider, HouseholdRole } from "@prisma/client";
import { createHash } from "node:crypto";
import { sign } from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantRequestContext } from "../src/common/http/request-url.util";
import { AuthService } from "../src/modules/auth/auth.service";

type HouseholdSettingsFixture = {
  localAuthEnabled: boolean;
  selfSignupEnabled: boolean;
  oidcEnabled: boolean;
  oidcAuthority: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcScope: string;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
};

const createHousehold = (
  overrides: Partial<HouseholdSettingsFixture> = {}
) => ({
  id: "household-1",
  tenantId: "tenant-1",
  settings: {
    localAuthEnabled: true,
    selfSignupEnabled: true,
    oidcEnabled: false,
    oidcAuthority: "",
    oidcClientId: "",
    oidcClientSecret: "",
    oidcScope: "openid profile email",
    smtpEnabled: true,
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "taskbandit",
    smtpPassword: "secret",
    smtpFromEmail: "bandit@example.com",
    smtpFromName: "TaskBandit",
    ...overrides
  }
});

describe("AuthService", () => {
  let prisma: {
    household: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    user: {
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    authIdentity: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    passwordResetToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    forceLocalAuthEnabled: boolean;
    hostedModeEnabled: boolean;
    hostedTenantRoutingMode: "path" | "subdomain";
    tenantPathPrefix: string;
    publicApiBaseUrl: string;
    publicWebBaseUrl: string;
    oidcFallbackConfig: {
      enabled: boolean;
      authority: string;
      clientId: string;
      clientSecret: string;
      scope: string;
      source: "env" | "none";
    };
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  let i18nService: {
    translate: (key: string) => string;
  };
  let smtpService: {
    sendMail: ReturnType<typeof vi.fn>;
  };
  let tenantContextService: {
    resolveFromRequest: ReturnType<typeof vi.fn>;
    resolveByTenantId: ReturnType<typeof vi.fn>;
  };
  let hostedRuntimeConfigService: {
    getTenantRuntimeConfig: ReturnType<typeof vi.fn>;
  };
  let tenantRuntimePolicyService: {
    getTenantAccessState: ReturnType<typeof vi.fn>;
  };
  let featureAccessService: {
    getFeatureAccessForTenant: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      household: {
        findFirst: vi.fn().mockResolvedValue(createHousehold())
      },
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "user-1",
          tenantId: "tenant-1",
          householdId: "household-1",
          displayName: "Alex",
          role: HouseholdRole.ADMIN,
          points: 12,
          currentStreak: 3,
          identities: [
            {
              provider: AuthProvider.LOCAL,
              email: "alex@example.com"
            }
          ]
        })
      },
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(undefined)
      },
      passwordResetToken: {
        create: vi.fn().mockResolvedValue(undefined),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(undefined),
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations))
    };

    appConfigService = {
      forceLocalAuthEnabled: false,
      hostedModeEnabled: false,
      hostedTenantRoutingMode: "path",
      tenantPathPrefix: "/t",
      publicApiBaseUrl: "https://api.taskbandit.app",
      publicWebBaseUrl: "https://app.taskbandit.app",
      oidcFallbackConfig: {
        enabled: false,
        authority: "",
        clientId: "",
        clientSecret: "",
        scope: "openid profile email",
        source: "none"
      },
      jwtSecret: "test-secret",
      jwtExpiresIn: "1h"
    };

    i18nService = {
      translate: (key: string) =>
        (
          {
            "auth.local_disabled": "Local authentication is disabled.",
            "auth.password_reset_unavailable": "Password reset is unavailable.",
            "auth.password_reset_requested": "If the account exists, a reset email has been sent.",
            "auth.password_reset_email_subject": "Reset your password",
            "auth.password_reset_email_intro": "Use the following link to reset your password.",
            "auth.password_reset_email_expiry": "This link expires in one hour.",
            "auth.password_reset_completed": "Password reset completed.",
            "auth.password_reset_invalid": "The password reset token is invalid."
          } as Record<string, string>
        )[key] ?? key
    };

    smtpService = {
      sendMail: vi.fn().mockResolvedValue(undefined)
    };
    tenantContextService = {
      resolveFromRequest: vi.fn().mockResolvedValue({
        tenantId: "tenant-1",
        householdId: "household-1",
        slug: "taskbandit-home",
        displayName: "TaskBandit Home",
        source: "self_hosted_default"
      }),
      resolveByTenantId: vi.fn().mockResolvedValue({
        tenantId: "tenant-1",
        householdId: "household-1",
        slug: "taskbandit-home",
        displayName: "TaskBandit Home",
        source: "hosted_env"
      })
    };
    hostedRuntimeConfigService = {
      getTenantRuntimeConfig: vi.fn().mockResolvedValue(null)
    };
    tenantRuntimePolicyService = {
      getTenantAccessState: vi.fn().mockResolvedValue({
        hostedMode: false,
        lifecycleState: "active",
        entitlementState: "active"
      })
    };
    featureAccessService = {
      getFeatureAccessForTenant: vi.fn().mockResolvedValue({})
    };

    service = new AuthService(
      prisma as never,
      appConfigService as never,
      i18nService as never,
      smtpService as never,
      tenantContextService as never,
      tenantRuntimePolicyService as never,
      hostedRuntimeConfigService as never,
      featureAccessService as never
    );
  });

  it("blocks password reset requests when local auth is disabled", async () => {
    prisma.household.findFirst.mockResolvedValue(
      createHousehold({
        localAuthEnabled: false
      })
    );

    await expect(
      service.requestPasswordReset(
        {
          email: "alex@example.com"
        },
        "https://taskbandit.example.com/reset?token=__TASKBANDIT_RESET_TOKEN__",
        "en"
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.authIdentity.findUnique).not.toHaveBeenCalled();
    expect(smtpService.sendMail).not.toHaveBeenCalled();
  });

  it("fails fast when smtp is unavailable for password reset", async () => {
    prisma.household.findFirst.mockResolvedValue(
      createHousehold({
        smtpEnabled: false
      })
    );

    await expect(
      service.requestPasswordReset(
        {
          email: "alex@example.com"
        },
        "https://taskbandit.example.com/reset?token=__TASKBANDIT_RESET_TOKEN__",
        "en"
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.authIdentity.findUnique).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("returns a generic success response when the account is unknown", async () => {
    const result = await service.requestPasswordReset(
      {
        email: " Alex@Example.com "
      },
      "https://taskbandit.example.com/reset?token=__TASKBANDIT_RESET_TOKEN__",
      "en"
    );

    expect(result).toEqual({
      ok: true,
      message: "If the account exists, a reset email has been sent."
    });
    expect(prisma.authIdentity.findUnique).toHaveBeenCalledWith({
      where: {
        email: "alex@example.com"
      },
      include: {
        user: true
      }
    });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(smtpService.sendMail).not.toHaveBeenCalled();
  });

  it("creates a reset token and sends mail for local accounts", async () => {
    prisma.authIdentity.findUnique.mockResolvedValue({
      id: "identity-1",
      provider: AuthProvider.LOCAL,
      email: "alex@example.com",
      passwordHash: "stored-password-hash",
      user: {
        id: "user-1",
        tenantId: "tenant-1"
      }
    });

    const result = await service.requestPasswordReset(
      {
        email: " Alex@Example.com "
      },
      "https://taskbandit.example.com/reset?token=__TASKBANDIT_RESET_TOKEN__",
      "en"
    );

    expect(result).toEqual({
      ok: true,
      message: "If the account exists, a reset email has been sent."
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authIdentityId: "identity-1",
        tokenHash: expect.any(String),
        expiresAtUtc: expect.any(Date)
      })
    });
    expect(smtpService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        host: "smtp.example.com",
        fromEmail: "bandit@example.com"
      }),
      expect.objectContaining({
        to: "alex@example.com",
        subject: "Reset your password",
        text: expect.stringContaining("https://taskbandit.example.com/reset?token="),
        html: expect.not.stringContaining("__TASKBANDIT_RESET_TOKEN__")
      })
    );
  });

  it("supports hosted root login by resolving tenant from the submitted email identity", async () => {
    tenantContextService.resolveFromRequest.mockRejectedValue(new NotFoundException("Tenant was not found."));
    const passwordHash = await service.hashPassword("password-123");
    prisma.authIdentity.findUnique.mockResolvedValue({
      id: "identity-1",
      provider: AuthProvider.LOCAL,
      email: "alex@example.com",
      passwordHash,
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        householdId: "household-1",
        role: HouseholdRole.ADMIN
      }
    });

    const response = await service.login(
      {
        email: "alex@example.com",
        password: "password-123"
      },
      "en",
      {
        hostHeader: "api.taskbandit.app",
        originalUrl: "/api/auth/login"
      }
    );

    expect(response).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer"
      })
    );
    expect(tenantContextService.resolveByTenantId).toHaveBeenCalledWith("tenant-1");
  });

  it("blocks hosted login when tenant lifecycle or entitlement is suspended", async () => {
    const passwordHash = await service.hashPassword("password-123");
    prisma.authIdentity.findUnique.mockResolvedValue({
      id: "identity-1",
      provider: AuthProvider.LOCAL,
      email: "alex@example.com",
      passwordHash,
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        householdId: "household-1",
        role: HouseholdRole.ADMIN
      }
    });
    tenantRuntimePolicyService.getTenantAccessState.mockResolvedValue({
      hostedMode: true,
      lifecycleState: "suspended",
      entitlementState: "active"
    });

    await expect(
      service.login(
        {
          email: "alex@example.com",
          password: "password-123"
        },
        "en",
        {
          hostHeader: "api.taskbandit.app",
          originalUrl: "/api/auth/login"
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("supports hosted root password reset request by resolving tenant from identity", async () => {
    tenantContextService.resolveFromRequest.mockRejectedValue(new NotFoundException("Tenant was not found."));
    prisma.authIdentity.findUnique.mockResolvedValue({
      id: "identity-1",
      provider: AuthProvider.LOCAL,
      email: "alex@example.com",
      passwordHash: "stored-password-hash",
      user: {
        id: "user-1",
        tenantId: "tenant-1"
      }
    });

    const result = await service.requestPasswordReset(
      {
        email: "alex@example.com"
      },
      "https://taskbandit.example.com/reset?token=__TASKBANDIT_RESET_TOKEN__",
      "en",
      {
        hostHeader: "my.taskbandit.app",
        originalUrl: "/api/auth/password-reset/request"
      }
    );

    expect(result).toEqual({
      ok: true,
      message: "If the account exists, a reset email has been sent."
    });
    expect(tenantContextService.resolveByTenantId).toHaveBeenCalledWith("tenant-1");
    expect(smtpService.sendMail).toHaveBeenCalledTimes(1);
  });

  it("updates the password and consumes outstanding reset tokens", async () => {
    const validResetToken = {
      id: "reset-token-1",
      usedAtUtc: null,
      expiresAtUtc: new Date(Date.now() + 15 * 60 * 1000),
      authIdentity: {
        id: "identity-1",
        provider: AuthProvider.LOCAL,
        user: {
          tenantId: "tenant-1"
        }
      }
    };

    prisma.passwordResetToken.findUnique.mockResolvedValue(validResetToken);

    const hashPasswordSpy = vi.spyOn(service, "hashPassword").mockResolvedValue("hashed-new-password");

    const result = await service.completePasswordReset(
      {
        token: "raw-reset-token",
        password: "NewPassword123!"
      },
      "en"
    );

    expect(result).toEqual({
      ok: true,
      message: "Password reset completed."
    });
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash("sha256").update("raw-reset-token").digest("hex")
      },
      include: {
        authIdentity: {
          include: {
            user: true
          }
        }
      }
    });
    expect(hashPasswordSpy).toHaveBeenCalledWith("NewPassword123!");
    expect(prisma.authIdentity.update).toHaveBeenCalledWith({
      where: {
        id: "identity-1"
      },
      data: {
        passwordHash: "hashed-new-password"
      }
    });
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: {
        id: "reset-token-1"
      },
      data: {
        usedAtUtc: expect.any(Date)
      }
    });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        authIdentityId: "identity-1",
        id: {
          not: "reset-token-1"
        },
        usedAtUtc: null
      },
      data: {
        usedAtUtc: expect.any(Date)
      }
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("builds auth responses with lowercase role metadata", async () => {
    const authInternals = service as unknown as {
      buildAuthResponse: (
        userId: string,
        tenantId: string,
        householdId: string,
        role: HouseholdRole,
        email?: string | null
      ) => Promise<{
        accessToken: string;
        tokenType: string;
        expiresIn: string;
        user: {
          id: string;
          tenantId: string;
          householdId: string;
          role: string;
          email: string | null;
        };
      }>;
    };

    const response = await authInternals.buildAuthResponse(
      "user-1",
      "tenant-1",
      "household-1",
      HouseholdRole.ADMIN,
      "alex@example.com"
    );

    expect(response).toEqual({
      accessToken: expect.any(String),
      tokenType: "Bearer",
      expiresIn: "1h",
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        householdId: "household-1",
        role: "admin",
        email: "alex@example.com"
      },
      tenantContext: {
        tenantId: "tenant-1",
        tenantSlug: "taskbandit-home",
        hostedMode: false,
        canonicalApiBaseUrl: "https://api.taskbandit.app",
        canonicalWebBaseUrl: "https://app.taskbandit.app"
      }
    });
  });

  it("rejects a bearer token when the trusted host resolves to a different tenant", async () => {
    tenantContextService.resolveFromRequest.mockResolvedValue({
      tenantId: "tenant-2",
      householdId: "household-2",
      slug: "other-home",
      displayName: "Other Home",
      source: "hostname"
    });

    const token = sign(
      {
        sub: "user-1",
        tenantId: "tenant-1",
        householdId: "household-1",
        role: "admin"
      },
      appConfigService.jwtSecret
    );

    await expect(
      service.getCurrentUser(`Bearer ${token}`, "en", {
        hostHeader: "other.taskbandit.app",
        originalUrl: "/api/auth/me"
      } satisfies TenantRequestContext)
    ).rejects.toThrow();
  });

  it("falls back to token tenant resolution when request context cannot resolve tenant host", async () => {
    tenantContextService.resolveFromRequest.mockRejectedValue(new NotFoundException("Tenant was not found."));

    const token = sign(
      {
        sub: "user-1",
        tenantId: "tenant-1",
        householdId: "household-1",
        role: "admin"
      },
      appConfigService.jwtSecret
    );

    const currentUser = await service.getCurrentUser(`Bearer ${token}`, "en", {
      hostHeader: "api.taskbandit.app",
      originalUrl: "/api/auth/me"
    } satisfies TenantRequestContext);

    expect(currentUser.tenantId).toBe("tenant-1");
    expect(tenantContextService.resolveByTenantId).toHaveBeenCalledWith("tenant-1");
  });
});
