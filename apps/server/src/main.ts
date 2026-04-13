import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";
import { AppLogService } from "./common/logging/app-log.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true
  });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLogService);

  app.useLogger(logger);

  const corsAllowedOrigins = config.corsAllowedOrigins;
  if (corsAllowedOrigins.length > 0) {
    app.enableCors({
      origin: (origin, callback) => {
        callback(null, !origin || corsAllowedOrigins.includes(origin));
      }
    });
  } else {
    app.enableCors();
  }
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    })
  );

  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
    get: (
      path: string | RegExp,
      handler: (
        request: unknown,
        response: { sendFile: (filePath: string) => void; redirect: (statusCode: number, location: string) => void }
      ) => void
    ) => void;
  };

  if (config.reverseProxyEnabled) {
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
    .setVersion(config.releaseVersion)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.withBasePath("docs"), app, swaggerDocument);

  const webRoot = join(process.cwd(), "public");
  const webIndex = join(webRoot, "index.html");
  const webMountPath = config.reverseProxyPathBase ? `/${config.reverseProxyPathBase}` : "/";

  if (config.serveEmbeddedWeb && existsSync(webIndex)) {
    if (webMountPath === "/") {
      app.useStaticAssets(webRoot);
    } else {
      app.useStaticAssets(webRoot, {
        prefix: webMountPath
      });
      expressApp.get(`${webMountPath}/`, (_request, response) => {
        response.sendFile(webIndex);
      });
    }
    expressApp.get(webMountPath, (_request, response) => {
      if (webMountPath === "/") {
        response.sendFile(webIndex);
        return;
      }

      response.redirect(308, `${webMountPath}/`);
    });
    const excludedRoutes = ["/api(?:/|$)", "/docs(?:/|$)"];
    if (webMountPath === "/") {
      excludedRoutes.push("/health$");
    }

    expressApp.get(
      new RegExp(`^${webMountPath === "/" ? "" : webMountPath}(?!${excludedRoutes.join("|")}).+`),
      (_request, response) => {
        response.sendFile(webIndex);
      }
    );
  }

  await app.listen(config.port);
  logger.log(`TaskBandit API listening on port ${config.port}.`, "Bootstrap");
}

void bootstrap();
