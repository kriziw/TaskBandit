import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";
import { AppLogService } from "./common/logging/app-log.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLogService);

  app.useLogger(logger);

  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    })
  );

  if (config.reverseProxyEnabled) {
    const expressApp = app.getHttpAdapter().getInstance() as { set: (key: string, value: unknown) => void };
    expressApp.set("trust proxy", true);
  }

  if (config.reverseProxyPathBase) {
    app.setGlobalPrefix(config.reverseProxyPathBase, {
      exclude: ["health"]
    });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle("TaskBandit API")
    .setDescription("TaskBandit household chores API")
    .setVersion("0.1.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.withBasePath("docs"), app, swaggerDocument);

  await app.listen(config.port);
  logger.log(`TaskBandit API listening on port ${config.port}.`, "Bootstrap");
}

void bootstrap();
