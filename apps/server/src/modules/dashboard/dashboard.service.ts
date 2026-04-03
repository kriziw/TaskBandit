import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repository: HouseholdRepository) {}

  getSummary() {
    return this.repository.getDashboardSummary();
  }
}

