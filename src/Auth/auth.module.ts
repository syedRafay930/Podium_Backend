import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/Users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { Users } from 'src/Entities/entities/Users';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RBACModule } from '../RBAC/rbac.module';
import { JwtBlacklistGuard } from './guards/jwt.guards';
@Module({
  imports: [
    TypeOrmModule.forFeature([Users]),
    forwardRef(() => UsersModule),
    forwardRef(() => RBACModule),
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        //signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '20m' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy , RedisService, JwtBlacklistGuard],
  controllers: [AuthController],
  exports: [RedisService , JwtModule, AuthService, JwtBlacklistGuard],
})
export class AuthModule {}
