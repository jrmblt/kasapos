import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3100",
    "http://localhost:3200",
    "http://localhost:3300",
    "http://localhost:3400",
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
