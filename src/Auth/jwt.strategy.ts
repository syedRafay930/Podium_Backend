import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), 
    });
  }

  async validate(payload: any) {
    return {
      email: payload.sub,
      first_name: payload.first_name,
      last_name: payload.last_name,
      id: payload.id,
      role_id: payload.role_id,
      role_name: payload.role_name
    }
}
}