import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { I18nService } from "../i18n/i18n.service";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly i18nService: I18nService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();
    const language = this.i18nService.resolveLanguage(request.headers["accept-language"]);
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    request.user = await this.authService.getCurrentUser(authorizationHeader, language);
    return true;
  }
}

