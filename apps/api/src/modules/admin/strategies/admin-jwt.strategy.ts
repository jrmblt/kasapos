import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../../prisma/prisma.service'

export interface AdminJwtPayload {
  sub: string
  email: string
  adminRole: string
  type: 'admin'  // ← discriminator ป้องกัน staff token ใช้ใน admin endpoint
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ADMIN_JWT_SECRET ?? 'admin-secret-change-me',
    })
  }

  async validate(payload: AdminJwtPayload): Promise<AdminJwtPayload> {
    // ป้องกัน staff token หลุดมาใช้
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type')
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    })

    if (!admin?.isActive) {
      throw new UnauthorizedException("Admin account inactive");
    }

    return payload
  }
}