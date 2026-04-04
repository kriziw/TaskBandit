import { Global, Module } from "@nestjs/common";
import { AppLogService } from "./app-log.service";

@Global()
@Module({
  providers: [AppLogService],
  exports: [AppLogService]
})
export class LoggingModule {}
