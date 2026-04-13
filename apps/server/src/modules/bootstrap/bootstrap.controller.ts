import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { I18nService } from "../../common/i18n/i18n.service";
import { BootstrapService } from "./bootstrap.service";
import { BootstrapHouseholdDto } from "./dto/bootstrap-household.dto";

@ApiTags("bootstrap")
@Controller("api/bootstrap")
export class BootstrapController {
  constructor(
    private readonly bootstrapService: BootstrapService,
    private readonly i18nService: I18nService
  ) {}

  @Get("status")
  status() {
    return this.bootstrapService.getStatus();
  }

  @Post("household")
  createHousehold(
    @Body() dto: BootstrapHouseholdDto,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.bootstrapService.bootstrapHousehold(dto, language);
  }

  @Get("languages")
  languages() {
    return this.i18nService.getSupportedLanguages();
  }

  @Get("starter-templates")
  starterTemplates(@Headers("accept-language") acceptLanguage?: string) {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    return this.bootstrapService.getStarterTemplateOptions(language);
  }
}

