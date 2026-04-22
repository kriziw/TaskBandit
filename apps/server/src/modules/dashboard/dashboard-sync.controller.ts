import { Controller, Header, Headers, MessageEvent, Query, Req, Sse, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { buildTenantRequestContext } from "../../common/http/request-url.util";
import { Observable } from "rxjs";
import { I18nService } from "../../common/i18n/i18n.service";
import { AuthService } from "../auth/auth.service";
import { DashboardSyncService } from "./dashboard-sync.service";

@ApiTags("dashboard")
@Controller("api/dashboard/sync")
export class DashboardSyncController {
  constructor(
    private readonly authService: AuthService,
    private readonly dashboardSyncService: DashboardSyncService,
    private readonly i18nService: I18nService
  ) {}

  @Sse("client-stream")
  @Header("Cache-Control", "no-cache")
  @Header("X-Accel-Buffering", "no")
  async streamClientSync(
    @Req() request: Request,
    @Query("token") token: string | undefined,
    @Headers("accept-language") acceptLanguage?: string
  ): Promise<Observable<MessageEvent>> {
    const language = this.i18nService.resolveLanguage(acceptLanguage);

    if (!token) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    const user = await this.authService.getCurrentUserFromDashboardSyncToken(
      token,
      language,
      buildTenantRequestContext(request)
    );
    return this.dashboardSyncService.streamForHousehold(user.householdId);
  }
}
