import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly repository: HouseholdRepository) {}

  getHousehold() {
    return this.repository.getHousehold();
  }

  updateSettings(dto: UpdateSettingsDto) {
    return this.repository.updateSettings(dto);
  }
}

