import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./common/prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "healthy",
        database: "up",
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "unhealthy",
        database: "down",
        timestamp: new Date().toISOString()
      });
    }
  }
}
