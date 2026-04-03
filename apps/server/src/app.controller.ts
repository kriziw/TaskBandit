import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: "TaskBandit API",
      status: "ok",
      version: "0.1.0"
    };
  }

  @Get("health")
  health() {
    return { status: "healthy" };
  }
}

