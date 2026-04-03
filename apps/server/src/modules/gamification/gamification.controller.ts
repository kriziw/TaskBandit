import { Controller, Get, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { DifficultyValue, PointsService } from "./points.service";

@ApiTags("gamification")
@Controller("api/gamification")
export class GamificationController {
  constructor(private readonly pointsService: PointsService) {}

  @Get("preview")
  @ApiQuery({ name: "difficulty", enum: ["easy", "medium", "hard"] })
  @ApiQuery({ name: "checklistItems", type: Number })
  @ApiQuery({ name: "isOverdue", type: Boolean })
  preview(
    @Query("difficulty") difficulty: DifficultyValue,
    @Query("checklistItems") checklistItems = "0",
    @Query("isOverdue") isOverdue = "false"
  ) {
    return this.pointsService.calculateForApprovedCompletion(
      difficulty ?? "easy",
      Number(checklistItems),
      isOverdue === "true"
    );
  }
}

