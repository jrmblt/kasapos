import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      // refresh token ส่งมาใน body
      jwtFromRequest:  ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey:     process.env.JWT_SECRET!,
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body?.refreshToken
    if (!refreshToken) throw new UnauthorizedException()
    return { ...payload, refreshToken }
  }
}