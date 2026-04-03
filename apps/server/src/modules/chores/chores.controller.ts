import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { ChoresService } from "./chores.service";
import { CreateChoreInstanceDto } from "./dto/create-chore-instance.dto";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";
import { memoryStorage } from "multer";

const proofUploadMaxBytes = 10 * 1024 * 1024;

@ApiTags("chores")
@Controller("api/chores")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChoresController {
  constructor(
    private readonly choresService: ChoresService,
    private readonly i18nService: I18nService
  ) {}

  @Get("templates")
  templates(@CurrentUser() user: AuthenticatedUser) {
    return this.choresService.getTemplates(user);
  }

  @Post("templates")
  @Roles("admin", "parent")
  createTemplate(@Body() dto: CreateChoreTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.choresService.createTemplate(dto, user);
  }

  @Put("templates/:id")
  @Roles("admin", "parent")
  updateTemplate(
    @Param("id") templateId: string,
    @Body() dto: CreateChoreTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.updateTemplate(
      templateId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Get("instances")
  instances(@CurrentUser() user: AuthenticatedUser) {
    return this.choresService.getInstances(user);
  }

  @Post("instances")
  @Roles("admin", "parent")
  createInstance(@Body() dto: CreateChoreInstanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.choresService.createInstance(dto, user);
  }

  @Put("instances/:id")
  @Roles("admin", "parent")
  updateInstance(
    @Param("id") instanceId: string,
    @Body() dto: CreateChoreInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.updateInstance(
      instanceId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/cancel")
  @Roles("admin", "parent")
  cancel(
    @Param("id") instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.cancelInstance(
      instanceId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("uploads/proof")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: proofUploadMaxBytes
      }
    })
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary"
        }
      },
      required: ["file"]
    }
  })
  uploadProof(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.uploadProof(file, user, this.i18nService.resolveLanguage(acceptLanguage));
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
