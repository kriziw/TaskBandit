import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../src/common/auth/authenticated-user.type";
import { SettingsService } from "../src/modules/settings/settings.service";

describe("SettingsService", () => {
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

  const householdFixture = {
    householdId: "household-1",
    name: "TaskBandit Home",
    settings: {
      selfSignupEnabled: false,
      onboardingCompleted: false,
      membersCanSeeFullHouseholdChoreDetails: true,
      enablePushNotifications: true,
      enableOverduePenalties: true,
      localAuthEnabled: true,
      localAuthForcedByConfig: false,
      localAuthEffective: true,
      oidcEnabled: false,
      oidcAuthority: "",
      oidcClientId: "",
      oidcClientSecret: "",
      oidcClientSecretConfigured: false,
      oidcScope: "openid profile email",
      oidcEffective: false,
      oidcSource: "none" as const,
      smtpEnabled: false,
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: false,
      smtpUsername: "",
      smtpPassword: "",
      smtpPasswordConfigured: false,
      smtpFromEmail: "",
      smtpFromName: ""
    },
    members: []
  };

  let repository: {
    getHousehold: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    createHouseholdMember: ReturnType<typeof vi.fn>;
    updateHouseholdMember: ReturnType<typeof vi.fn>;
  };
  let authService: {
    hashPassword: ReturnType<typeof vi.fn>;
  };
  let smtpService: {
    sendMail: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let hostedRuntimeConfigService: {
    getTenantRuntimeConfig: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    forceLocalAuthEnabled: boolean;
    hostedModeEnabled: boolean;
    oidcFallbackConfig: {
      enabled: boolean;
      authority: string;
      clientId: string;
      clientSecret: string;
      scope: string;
      source: "env" | "none";
    };
  };
  let service: SettingsService;

  beforeEach(() => {
    repository = {
      getHousehold: vi.fn().mockResolvedValue(householdFixture),
      updateSettings: vi.fn().mockResolvedValue(householdFixture),
      createHouseholdMember: vi.fn().mockResolvedValue({
        household: householdFixture,
        createdMember: {
          id: "member-1",
          displayName: "Sam",
          role: "child",
          email: "sam@example.com"
        }
      }),
      updateHouseholdMember: vi.fn().mockResolvedValue(householdFixture)
    };
    authService = {
      hashPassword: vi.fn().mockResolvedValue("hashed-password")
    };
    smtpService = {
      sendMail: vi.fn().mockResolvedValue(undefined),
      verify: vi.fn().mockResolvedValue({ ok: true })
    };
    hostedRuntimeConfigService = {
      getTenantRuntimeConfig: vi.fn().mockResolvedValue(null)
    };
    appConfigService = {
      forceLocalAuthEnabled: false,
      hostedModeEnabled: false,
      oidcFallbackConfig: {
        enabled: false,
        authority: "",
        clientId: "",
        clientSecret: "",
        scope: "openid profile email",
        source: "none"
      }
    };

    service = new SettingsService(
      repository as never,
      authService as never,
      {
        translate: (key: string) =>
          ({
            "auth.email_in_use": "Email already in use.",
            "members.invite_unavailable": "Invite email unavailable.",
            "members.invite_email_subject": "Invite",
            "members.invite_email_intro": "Hi {name}",
            "members.invite_email_sign_in": "Sign in here",
            "members.invite_email_email": "Email",
            "members.invite_email_password": "Password",
            "members.invite_email_footer": "Footer"
          })[key] ?? key
      } as never,
      appConfigService as never,
      smtpService as never,
      hostedRuntimeConfigService as never
    );
  });

  it("rejects enabling oidc without authority and client id", async () => {
    await expect(
      service.updateSettings(
        {
          oidcEnabled: true,
          oidcAuthority: "",
          oidcClientId: ""
        },
        user
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects disabling every sign-in path without a fallback", async () => {
    await expect(
      service.updateSettings(
        {
          localAuthEnabled: false,
          oidcEnabled: false
        },
        user
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows local auth to be disabled when config forces a recovery path", async () => {
    appConfigService.forceLocalAuthEnabled = true;

    await expect(
      service.updateSettings(
        {
          localAuthEnabled: false,
          oidcEnabled: false
        },
        user
      )
    ).resolves.toEqual(
      expect.objectContaining({
        settings: expect.objectContaining({
          localAuthForcedByConfig: true,
          localAuthEffective: true
        })
      })
    );
  });

  it("rejects hosted-managed oidc and smtp edits when hosted mode is enabled", async () => {
    appConfigService.hostedModeEnabled = true;

    await expect(service.updateSettings({ oidcEnabled: true }, user)).rejects.toBeInstanceOf(
      BadRequestException
    );

    await expect(service.updateSettings({ smtpEnabled: true }, user)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("hashes a replacement password when updating a member", async () => {
    await service.updateHouseholdMember(
      "member-1",
      {
        displayName: "Sam",
        role: "child",
        email: "sam@example.com",
        password: "NewPassword123!"
      },
      user,
      "en"
    );

    expect(authService.hashPassword).toHaveBeenCalledWith("NewPassword123!");
    expect(repository.updateHouseholdMember).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({
        displayName: "Sam"
      }),
      "household-1",
      "Email already in use.",
      "user-1",
      "hashed-password"
    );
  });

  it("does not hash a password when editing member details only", async () => {
    await service.updateHouseholdMember(
      "member-1",
      {
        displayName: "Sam",
        role: "child",
        email: "sam@example.com"
      },
      user,
      "en"
    );

    expect(authService.hashPassword).not.toHaveBeenCalled();
    expect(repository.updateHouseholdMember).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({
        email: "sam@example.com"
      }),
      "household-1",
      "Email already in use.",
      "user-1",
      undefined
    );
  });

  it("rejects invite emails when no sign-in url is available", async () => {
    await expect(
      service.createHouseholdMember(
        {
          displayName: "Sam",
          role: "child",
          email: "sam@example.com",
          password: "TaskBandit123!",
          sendInviteEmail: true
        },
        user,
        "en"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("sends an invite email when smtp is enabled and the admin asks for it", async () => {
    repository.getHousehold.mockResolvedValue({
      ...householdFixture,
      settings: {
        ...householdFixture.settings,
        smtpEnabled: true,
        smtpHost: "smtp.example.com",
        smtpPort: 587,
        smtpFromEmail: "bandit@example.com",
        smtpFromName: "TaskBandit",
        smtpPasswordConfigured: true
      }
    });

    const result = await service.createHouseholdMember(
      {
        displayName: "Sam",
        role: "child",
        email: "sam@example.com",
        password: "TaskBandit123!",
        sendInviteEmail: true
      },
      user,
      "en",
      "https://taskbandit.example.com/"
    );

    expect(authService.hashPassword).toHaveBeenCalledWith("TaskBandit123!");
    expect(smtpService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        host: "smtp.example.com"
      }),
      expect.objectContaining({
        to: "sam@example.com",
        subject: "Invite"
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        inviteEmailSent: true
      })
    );
  });

  it("tests smtp against the supplied draft settings even while smtp is disabled", async () => {
    repository.getHousehold.mockResolvedValue({
      ...householdFixture,
      settings: {
        ...householdFixture.settings,
        smtpEnabled: false,
        smtpHost: "persisted.example.com",
        smtpPort: 587,
        smtpUsername: "persisted-user",
        smtpPassword: "persisted-secret",
        smtpPasswordConfigured: true,
        smtpFromEmail: "persisted@example.com",
        smtpFromName: "Persisted Sender"
      }
    });

    await expect(
      service.testSmtp(
        {
          smtpEnabled: false,
          smtpHost: "draft.example.com",
          smtpPort: 2525,
          smtpSecure: true,
          smtpUsername: "draft-user",
          smtpPassword: "draft-secret",
          smtpFromEmail: "draft@example.com",
          smtpFromName: "Draft Sender"
        },
        user
      )
    ).resolves.toEqual({ ok: true });

    expect(smtpService.verify).toHaveBeenCalledWith({
      enabled: false,
      host: "draft.example.com",
      port: 2525,
      secure: true,
      username: "draft-user",
      password: "draft-secret",
      fromEmail: "draft@example.com",
      fromName: "Draft Sender",
      passwordConfigured: true
    });
  });

  it("rejects enabling smtp before the current draft has been tested successfully", async () => {
    repository.getHousehold.mockResolvedValue({
      ...householdFixture,
      settings: {
        ...householdFixture.settings,
        smtpEnabled: false,
        smtpHost: "draft.example.com",
        smtpPort: 2525,
        smtpUsername: "draft-user",
        smtpPassword: "draft-secret",
        smtpPasswordConfigured: true,
        smtpFromEmail: "draft@example.com",
        smtpFromName: "Draft Sender"
      }
    });

    await expect(
      service.updateSettings(
        {
          smtpEnabled: true
        },
        user
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows enabling smtp after the same draft settings pass a test", async () => {
    const draftHousehold = {
      ...householdFixture,
      settings: {
        ...householdFixture.settings,
        smtpEnabled: false,
        smtpHost: "draft.example.com",
        smtpPort: 2525,
        smtpUsername: "draft-user",
        smtpPassword: "draft-secret",
        smtpPasswordConfigured: true,
        smtpFromEmail: "draft@example.com",
        smtpFromName: "Draft Sender"
      }
    };

    repository.getHousehold.mockResolvedValue(draftHousehold);
    repository.updateSettings.mockResolvedValue({
      ...draftHousehold,
      settings: {
        ...draftHousehold.settings,
        smtpEnabled: true
      }
    });

    await service.testSmtp(
      {
        smtpEnabled: false,
        smtpHost: "draft.example.com",
        smtpPort: 2525,
        smtpSecure: false,
        smtpUsername: "draft-user",
        smtpPassword: "draft-secret",
        smtpFromEmail: "draft@example.com",
        smtpFromName: "Draft Sender"
      },
      user
    );

    await expect(
      service.updateSettings(
        {
          smtpEnabled: true
        },
        user
      )
    ).resolves.toEqual(
      expect.objectContaining({
        settings: expect.objectContaining({
          smtpEnabled: true
        })
      })
    );
  });
});
