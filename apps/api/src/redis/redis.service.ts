import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      enableReadyCheck: true,
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // ── Refresh token keys ────────────────────────────────
  // pattern: refresh:{userId}:{tokenId}
  refreshKey(userId: string, tokenId: string) {
    return `refresh:${userId}:${tokenId}`;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  // ลบทุก refresh token ของ user (kick ทุก device)
  async delPattern(pattern: string) {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }
}
