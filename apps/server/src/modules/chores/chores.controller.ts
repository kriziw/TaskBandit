import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ChoresService } from "./chores.service";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";

@ApiTags("chores")
@Controller("api/chores")
export class ChoresController {
  constructor(private readonly choresService: ChoresService) {}

  @Get("templates")
  templates() {
    return this.choresService.getTemplates();
  }

  @Post("templates")
  createTemplate(@Body() dto: CreateChoreTemplateDto) {
    return this.choresService.createTemplate(dto);
  }

  @Get("instances")
  instances() {
    return this.choresService.getInstances();
  }
}

