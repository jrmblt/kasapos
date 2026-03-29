import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload } from '../decorators/current-user.decorator'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:      process.env.JWT_SECRET!,
      ignoreExpiration: false,
    })
  }

  // validate ถูกเรียกหลัง verify signature ผ่านแล้ว
  // ตรงนี้ไม่ hit DB — แค่ return payload เข้า request.user
  // tokenVersion จะ check ตอน refresh เท่านั้น
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return payload
  }
}