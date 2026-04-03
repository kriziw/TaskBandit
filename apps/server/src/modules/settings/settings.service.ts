import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly repository: HouseholdRepository) {}

  getHousehold(user: AuthenticatedUser) {
    return this.repository.getHousehold(user.householdId);
  }

  updateSettings(dto: UpdateSettingsDto, user: AuthenticatedUser) {
    return this.repository.updateSettings(dto, user.householdId);
  }
}
