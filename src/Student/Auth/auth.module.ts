import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../User/user.module';
import { StdJwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { Student } from 'src/Entities/entities/Student';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { RBACModule } from '../RBAC/rbac.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    forwardRef(() => UsersModule),
    //forwardRef(() => RBACModule),
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '20m' },
      }),
    }),
  ],
  providers: [AuthService, StdJwtStrategy , RedisService],
  controllers: [AuthController],
  exports: [RedisService , JwtModule, AuthService]
})
export class AuthModule {}
