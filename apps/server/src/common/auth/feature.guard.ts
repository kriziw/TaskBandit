import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppConfigService } from "../config/app-config.service";
import { FeatureAccessService, PackageFeatureId } from "../tenancy/feature-access.service";
import type { AuthenticatedUser } from "./authenticated-user.type";
import { FEATURE_METADATA_KEY } from "./requires-feature.decorator";

/**
 * Enforces {@link RequiresFeature} metadata on controller routes.
 *
 * Must be applied after {@link JwtAuthGuard} (which populates `request.user`).
 *
 * In hosted mode the guard re-fetches the tenant's current feature access from
 * the control plane on every request so plan downgrades take effect immediately
 * without requiring a re-login.
 *
 * In self-hosted mode the feature access embedded in the JWT is used directly,
 * matching the existing behaviour of the in-service `requireFeature` helper.
 *
 * Routes without a {@link RequiresFeature} decorator are passed through
 * unconditionally, so the guard is safe to apply at the class level.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly appConfigService: AppConfigService,
    private readonly featureAccessService: FeatureAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<PackageFeatureId | undefined>(
      FEATURE_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      // JwtAuthGuard should have already rejected unauthenticated requests.
      // This is a safety-net for unusual guard ordering.
      return false;
    }

    const effectiveFeatureAccess = this.appConfigService.hostedModeEnabled
      ? await this.featureAccessService.getFeatureAccessForTenant(user.tenantId)
      : user.featureAccess;

    // assertEnabled throws ForbiddenException if the feature is disabled.
    this.featureAccessService.assertEnabled(effectiveFeatureAccess, requiredFeature);
    return true;
  }
}
