import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

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
    app.setGlobalPrefix(config.reverseProxyPathBase);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle("TaskBandit API")
    .setDescription("TaskBandit household chores API")
    .setVersion("0.1.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.withBasePath("docs"), app, swaggerDocument);

  await app.listen(config.port);
}

void bootstrap();
