import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { I18nService } from "../../common/i18n/i18n.service";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
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

  @Get("me")
  me(
    @Headers("authorization") authorizationHeader: string | undefined,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.authService.getCurrentUser(authorizationHeader, language);
  }
}

