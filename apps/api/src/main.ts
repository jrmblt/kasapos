import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // ไม่ผ่าน global prefix — ชี้ทางไป /health กับ /api (เส้นทางจริงของแอปอยู่ใต้ /api)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get("/", (_req, res) => {
    res.status(200).json({
      service: "serva-api",
      health: "/health",
      api: "/api",
    });
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3100",
    "http://localhost:3200",
    "http://localhost:3300",
    "http://localhost:3400",
    "http://localhost:3500",
    "https://www.pos.blttech.net",
    "https://pos.pos.blttech.net",
    "https://bo.pos.blttech.net",
    "https://kds.pos.blttech.net",
    "https://order.pos.blttech.net",
    "https://www.pos.blttech.net",
    "https://pos.pos.blttech.net",
    "https://bo.pos.blttech.net",
    "https://kds.pos.blttech.net",
    "https://order.pos.blttech.net",
    "https://cashier.pos.blttech.net",
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่ได้ declare ใน DTO ออก
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
