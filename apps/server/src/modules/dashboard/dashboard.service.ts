import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repository: HouseholdRepository) {}

  getSummary(user: AuthenticatedUser) {
    return this.repository.getDashboardSummary(user.householdId);
  }
}
