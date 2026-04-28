import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sua_chave_secreta_super_segura',
    });
  }

  async validate(payload: any) {
    // Esse retorno é injetado automaticamente no objeto request (req.user)
    return { userId: payload.sub, email: payload.email };
  }
}