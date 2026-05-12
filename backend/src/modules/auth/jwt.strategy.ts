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

  validate(payload: any) {
    // Esse retorno é injetado automaticamente no objeto request (req.user)
    // CORREÇÃO: Adicionado 'role' para que o RolesGuard consiga validar o perfil do usuário
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role 
    };
  }
}
