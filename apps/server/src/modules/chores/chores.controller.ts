import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { ChoresService } from "./chores.service";
import { CreateChoreInstanceDto } from "./dto/create-chore-instance.dto";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { RequestChoreTakeoverDto } from "./dto/request-chore-takeover.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { RespondChoreTakeoverDto } from "./dto/respond-chore-takeover.dto";
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
  @Roles("admin", "parent")
  templates(@CurrentUser() user: AuthenticatedUser, @Headers("accept-language") acceptLanguage?: string) {
    return this.choresService.getTemplates(user, this.i18nService.resolveLanguage(acceptLanguage));
  }

  @Post("templates")
  @Roles("admin", "parent")
  createTemplate(
    @Body() dto: CreateChoreTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.createTemplate(dto, user, this.i18nService.resolveLanguage(acceptLanguage));
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

  @Delete("templates/:id")
  @Roles("admin", "parent")
  deleteTemplate(
    @Param("id") templateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.deleteTemplate(
      templateId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Get("instances")
  instances(@CurrentUser() user: AuthenticatedUser, @Headers("accept-language") acceptLanguage?: string) {
    return this.choresService.getInstances(user, this.i18nService.resolveLanguage(acceptLanguage));
  }

  @Get("takeover-requests")
  takeoverRequests(@CurrentUser() user: AuthenticatedUser, @Headers("accept-language") acceptLanguage?: string) {
    return this.choresService.getTakeoverRequests(user, this.i18nService.resolveLanguage(acceptLanguage));
  }

  @Post("instances")
  @Roles("admin", "parent")
  createInstance(
    @Body() dto: CreateChoreInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.createInstance(dto, user, this.i18nService.resolveLanguage(acceptLanguage));
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

  @Post("instances/:id/close-cycle")
  @Roles("admin", "parent")
  closeCycle(
    @Param("id") instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.closeCycle(
      instanceId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/start")
  start(
    @Param("id") instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.startInstance(
      instanceId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/takeover")
  takeOver(
    @Param("id") instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.takeOverInstance(
      instanceId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("instances/:id/takeover-request")
  requestTakeOver(
    @Param("id") instanceId: string,
    @Body() dto: RequestChoreTakeoverDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.requestTakeover(
      instanceId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("takeover-requests/:id/approve")
  approveTakeOverRequest(
    @Param("id") requestId: string,
    @Body() dto: RespondChoreTakeoverDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.approveTakeoverRequest(
      requestId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  @Post("takeover-requests/:id/decline")
  declineTakeOverRequest(
    @Param("id") requestId: string,
    @Body() dto: RespondChoreTakeoverDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.choresService.declineTakeoverRequest(
      requestId,
      dto,
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

  @Get("attachments/:id")
  async downloadAttachment(
    @Param("id") attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    const attachment = await this.choresService.downloadAttachment(
      attachmentId,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
    const safeFilename = this.buildContentDispositionFilename(attachment.clientFilename);

    response.setHeader("Content-Type", attachment.contentType ?? "application/octet-stream");
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${safeFilename.asciiFallback}"; filename*=UTF-8''${safeFilename.encoded}`
    );
    response.setHeader("Cache-Control", "private, max-age=300");

    return new StreamableFile(attachment.fileBuffer);
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

  private buildContentDispositionFilename(filename: string) {
    const normalizedFilename = filename.trim() || "proof-image";
    const asciiFallback = normalizedFilename.replace(/[^a-zA-Z0-9._-]+/g, "-") || "proof-image";

    return {
      asciiFallback,
      encoded: encodeURIComponent(normalizedFilename)
    };
  }
}
