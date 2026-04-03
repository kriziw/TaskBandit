import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";

@Injectable()
export class ChoresService {
  constructor(private readonly repository: HouseholdRepository) {}

  getTemplates() {
    return this.repository.getTemplates();
  }

  createTemplate(dto: CreateChoreTemplateDto) {
    return this.repository.createTemplate(dto);
  }

  getInstances() {
    return this.repository.getInstances();
  }
}

