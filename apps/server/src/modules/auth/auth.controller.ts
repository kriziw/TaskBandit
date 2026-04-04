import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { I18nService } from "../../common/i18n/i18n.service";
import { AuthService } from "./auth.service";
import { CompletePasswordResetDto } from "./dto/complete-password-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { SignupDto } from "./dto/signup.dto";

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18nService: I18nService
  ) {}

  @Get("providers")
  providers() {
    return this.authService.getProviders();
  }

  @Get("oidc/start")
  async oidcStart(
    @Req() request: Request,
    @Res() response: Response,
    @Query("returnTo") returnTo?: string,
    @Query("language") requestedLanguage?: string,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(requestedLanguage ?? acceptLanguage);
    const callbackUrl = this.buildOidcCallbackUrl(request);
    const safeReturnTo = this.normalizeReturnTo(request, returnTo);
    try {
      const state = this.authService.createOidcState(safeReturnTo, language);
      const authorizationUrl = await this.authService.buildOidcAuthorizationUrl(callbackUrl, state);
      response.redirect(authorizationUrl);
    } catch (error) {
      response.redirect(
        this.appendOidcErrorToReturnUrl(safeReturnTo, request, this.readAuthErrorMessage(error))
      );
    }
  }

  @Get("oidc/callback")
  async oidcCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query("code") code?: string,
    @Query("state") state?: string
  ) {
    const fallbackReturnTo = this.normalizeReturnTo(request);

    if (!state || !code) {
      response.redirect(this.appendOidcErrorToReturnUrl(fallbackReturnTo, request, "Missing OIDC callback data."));
      return;
    }

    let parsedState: ReturnType<AuthService["verifyOidcState"]>;
    try {
      parsedState = this.authService.verifyOidcState(state, "en");
    } catch (error) {
      response.redirect(
        this.appendOidcErrorToReturnUrl(
          fallbackReturnTo,
          request,
          this.readAuthErrorMessage(error, "Invalid OIDC state.")
        )
      );
      return;
    }

    const callbackUrl = this.buildOidcCallbackUrl(request);

    try {
      const authResponse = await this.authService.completeOidcLogin(
        code,
        callbackUrl,
        parsedState.language
      );

      response.redirect(
        this.appendOidcTokenToReturnUrl(parsedState.returnTo, request, authResponse.accessToken)
      );
    } catch (error) {
      response.redirect(
        this.appendOidcErrorToReturnUrl(
          parsedState.returnTo,
          request,
          this.readAuthErrorMessage(error, "OIDC sign-in failed.")
        )
      );
    }
  }

  @Post("login")
  login(@Body() dto: LoginDto, @Headers("accept-language") acceptLanguage?: string) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.login(dto, language);
  }

  @Post("signup")
  signup(@Body() dto: SignupDto, @Headers("accept-language") acceptLanguage?: string) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.signup(dto, language);
  }

  @Post("password-reset/request")
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.requestPasswordReset(
      dto,
      this.buildPasswordResetUrl(request),
      language
    );
  }

  @Post("password-reset/complete")
  completePasswordReset(
    @Body() dto: CompletePasswordResetDto,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.completePasswordReset(dto, language);
  }

  @Get("me")
  me(
    @Headers("authorization") authorizationHeader: string | undefined,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.getCurrentUser(authorizationHeader, language);
  }

  private buildOidcCallbackUrl(request: Request) {
    const currentUrl = new URL(request.originalUrl || request.url, this.buildRequestOrigin(request));
    currentUrl.search = "";
    currentUrl.hash = "";
    currentUrl.pathname = currentUrl.pathname.replace(/\/start$/, "/callback");
    return currentUrl.toString();
  }

  private normalizeReturnTo(request: Request, requestedReturnTo?: string) {
    const requestOrigin = this.buildRequestOrigin(request);
    const fallbackUrl = new URL(this.resolveAppPath(request), requestOrigin);

    if (!requestedReturnTo?.trim()) {
      return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`;
    }

    try {
      const candidateUrl = new URL(requestedReturnTo, requestOrigin);
      if (candidateUrl.origin !== fallbackUrl.origin) {
        return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`;
      }

      return `${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`;
    } catch {
      return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`;
    }
  }

  private appendOidcTokenToReturnUrl(returnTo: string, request: Request, accessToken: string) {
    const url = new URL(returnTo, this.buildRequestOrigin(request));
    url.searchParams.set("oidcToken", accessToken);
    url.searchParams.delete("oidcError");
    return url.toString();
  }

  private appendOidcErrorToReturnUrl(returnTo: string, request: Request, message: string) {
    const url = new URL(returnTo, this.buildRequestOrigin(request));
    url.searchParams.set("oidcError", message);
    url.searchParams.delete("oidcToken");
    return url.toString();
  }

  private buildPasswordResetUrl(request: Request) {
    const url = new URL(this.resolveAppPath(request), this.buildRequestOrigin(request));
    url.searchParams.set("resetToken", "__TASKBANDIT_RESET_TOKEN__");
    return url.toString();
  }

  private resolveAppPath(request: Request) {
    const originalUrl = request.originalUrl || request.url;
    const apiRouteIndex = originalUrl.indexOf("/api/auth/");
    if (apiRouteIndex < 0) {
      return "/";
    }

    const appPath = originalUrl.slice(0, apiRouteIndex).replace(/\/+$/, "");
    return appPath || "/";
  }

  private buildRequestOrigin(request: Request) {
    const forwardedProtocol = request.headers["x-forwarded-proto"];
    const forwardedHost = request.headers["x-forwarded-host"];
    const protocol =
      (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(",")[0]?.trim() ||
      request.protocol;
    const host =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)?.split(",")[0]?.trim() ||
      request.get("host");

    return `${protocol}://${host}`;
  }

  private readAuthErrorMessage(error: unknown, fallback = "OIDC sign-in failed.") {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === "string") {
        return response;
      }

      if (response && typeof response === "object" && "message" in response) {
        const message = response.message;
        if (Array.isArray(message)) {
          return message.join(", ");
        }

        if (typeof message === "string") {
          return message;
        }
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}
