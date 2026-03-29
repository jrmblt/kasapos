import { Global, Module } from "@nestjs/common";
import { db } from "@repo/database";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: db }],
  exports: [PrismaService],
})
export class PrismaModule {}
