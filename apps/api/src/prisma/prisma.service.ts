import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createAdapter, PrismaClient } from "@repo/database";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
