import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StdJwtStrategy extends PassportStrategy(Strategy, 'std-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), 
    });
  }

  async validate(payload: any) {
    return {
      student_email: payload.sub,
      student_first_name: payload.first_name,
      student_last_name: payload.last_name,
      student_id: payload.student_id
    }
}
}