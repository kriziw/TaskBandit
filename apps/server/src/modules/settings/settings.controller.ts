import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiTags("settings")
@Controller("api/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("household")
  getHousehold() {
    return this.settingsService.getHousehold();
  }

  @Put("household")
  updateHousehold(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}

