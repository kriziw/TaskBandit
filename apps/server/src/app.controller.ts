import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "./common/config/app-config.service";
import { PrismaService } from "./common/prisma/prisma.service";

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService
  ) {}

  @Get("health")
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "healthy",
        database: "up",
        releaseVersion: this.config.releaseVersion,
        buildNumber: this.config.buildNumber,
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "unhealthy",
        database: "down",
        releaseVersion: this.config.releaseVersion,
        buildNumber: this.config.buildNumber,
        timestamp: new Date().toISOString()
      });
    }
  }

  @Get("api/meta/release")
  getReleaseInfo() {
    return {
      releaseVersion: this.config.releaseVersion,
      buildNumber: this.config.buildNumber,
      commitSha: this.config.commitSha
    };
  }
}
