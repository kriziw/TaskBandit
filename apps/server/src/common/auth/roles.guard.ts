import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { I18nService } from "../i18n/i18n.service";
import { AuthenticatedUser } from "./authenticated-user.type";
import { ROLE_METADATA_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService
  ) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Array<"admin" | "parent" | "child">>(
      ROLE_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user: AuthenticatedUser;
    }>();
    const language = this.i18nService.resolveLanguage(request.headers["accept-language"]);

    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.forbidden", language)
      });
    }

    return true;
  }
}

