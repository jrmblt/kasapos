import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      enableReadyCheck: true,
    });
    this.client.on("connect", () => this.logger.log("Redis connected"));
    this.client.on("error", (err) => this.logger.error("Redis error", err));
  }

  onModuleDestroy() {
    // this.client.disconnect();
    this.client.quit();
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
  // async delPattern(pattern: string) {
  //   const keys = await this.client.keys(pattern);
  //   if (keys.length > 0) await this.client.del(...keys);
  // }
  async delPattern(pattern: string) {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];

    stream.on("data", (batch: string[]) => keys.push(...batch));
    await new Promise<void>((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    if (keys.length > 0) await this.client.del(...keys);
  }
}
