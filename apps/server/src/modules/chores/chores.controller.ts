import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { ChoresService } from "./chores.service";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";

@ApiTags("chores")
@Controller("api/chores")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChoresController {
  constructor(
    private readonly choresService: ChoresService,
    private readonly i18nService: I18nService
  ) {}

  @Get("templates")
  templates() {
    return this.choresService.getTemplates();
  }

  @Post("templates")
  @Roles("admin", "parent")
  createTemplate(@Body() dto: CreateChoreTemplateDto) {
    return this.choresService.createTemplate(dto);
  }

  @Get("instances")
  instances() {
    return this.choresService.getInstances();
  }

  @Post("instances/:id/submit")
  submit(
    @Param("id") instanceId: string,
    @Body() dto: SubmitChoreDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.submitInstance(
      instanceId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/approve")
  @Roles("admin", "parent")
  approve(
    @Param("id") instanceId: string,
    @Body() dto: ReviewChoreDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.approveInstance(
      instanceId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/reject")
  @Roles("admin", "parent")
  reject(
    @Param("id") instanceId: string,
    @Body() dto: ReviewChoreDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.rejectInstance(
      instanceId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }
}
