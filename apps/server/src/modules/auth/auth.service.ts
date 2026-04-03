import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthProvider, HouseholdRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Secret, sign, SignOptions, verify } from "jsonwebtoken";
import { AppConfigService } from "../../common/config/app-config.service";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

type AuthTokenPayload = {
  sub: string;
  householdId: string;
  role: string;
  email?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService
  ) {}

  async hashPassword(password: string) {
    return hash(password, 12);
  }

  async login(dto: LoginDto, language: SupportedLanguage) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      },
      include: {
        user: true
      }
    });

    if (!identity || identity.provider !== AuthProvider.LOCAL || !identity.passwordHash) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.invalid_credentials", language)
      });
    }

    const passwordMatches = await compare(dto.password, identity.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.invalid_credentials", language)
      });
    }

    return this.buildAuthResponse(identity.user.id, identity.user.householdId, identity.user.role, identity.email);
  }

  async signup(dto: SignupDto, language: SupportedLanguage) {
    const household = await this.prisma.household.findFirst({
      include: {
        settings: true
      }
    });

    if (!household) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.bootstrap_required", language)
      });
    }

    if (!household.settings?.selfSignupEnabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.self_signup_disabled", language)
      });
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingIdentity) {
      throw new ConflictException({
        message: this.i18nService.translate("auth.email_in_use", language)
      });
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        householdId: household.id,
        displayName: dto.displayName.trim(),
        role: HouseholdRole.PARENT,
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

    return this.buildAuthResponse(user.id, user.householdId, user.role, normalizedEmail);
  }

  async getCurrentUser(
    authorizationHeader: string | undefined,
    language: SupportedLanguage
  ): Promise<AuthenticatedUser> {
    const token = this.extractBearerToken(authorizationHeader);
    if (!token) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    try {
      const payload = verify(token, this.appConfigService.jwtSecret) as AuthTokenPayload;
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.sub
        },
        include: {
          identities: {
            where: {
              provider: AuthProvider.LOCAL
            },
            take: 1
          }
        }
      });

      return {
        id: user.id,
        householdId: user.householdId,
        displayName: user.displayName,
        role: this.mapRole(user.role),
        email: user.identities[0]?.email ?? null,
        points: user.points,
        currentStreak: user.currentStreak
      };
    } catch {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }
  }

  getProviders() {
    return {
      local: {
        enabled: true
      },
      oidc: this.appConfigService.oidcConfig
    };
  }

  private buildAuthResponse(userId: string, householdId: string, role: HouseholdRole, email?: string | null) {
    const accessToken = sign(
      {
        sub: userId,
        householdId,
        role: role.toLowerCase(),
        email: email ?? undefined
      },
      this.appConfigService.jwtSecret as Secret,
      {
        expiresIn: this.appConfigService.jwtExpiresIn as SignOptions["expiresIn"]
      }
    );

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: this.appConfigService.jwtExpiresIn,
      user: {
        id: userId,
        householdId,
        role: role.toLowerCase(),
        email: email ?? null
      }
    };
  }

  private extractBearerToken(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return null;
    }

    return token;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private mapRole(role: HouseholdRole): AuthenticatedUser["role"] {
    switch (role) {
      case HouseholdRole.ADMIN:
        return "admin";
      case HouseholdRole.PARENT:
        return "parent";
      case HouseholdRole.CHILD:
        return "child";
    }
  }
}
