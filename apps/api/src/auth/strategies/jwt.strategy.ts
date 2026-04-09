import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtPayload } from "../decorators/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // ตรวจ tokenVersion ผ่าน membership — Redis-first, fallback DB
    const cachedVersion = await this.redis.get(`tv:${payload.membershipId}`);

    const currentVersion = cachedVersion
      ? parseInt(cachedVersion)
      : await this.prisma.tenantMembership
          .findUnique({
            where: { id: payload.membershipId },
            select: { tokenVersion: true, isActive: true },
          })
          .then((m) => {
            if (!m?.isActive) throw new UnauthorizedException();
            return m.tokenVersion;
          });

    if (payload.tokenVersion !== currentVersion) {
      throw new UnauthorizedException("Token revoked");
    }

    return payload;
  }
}
