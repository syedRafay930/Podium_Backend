import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
//import { UsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from '../Auth/auth.module';
//import { MailModule } from 'src/Nodemailer/mailer.module';
import { Users } from 'src/Entities/entities/Users';
import { UserRole } from 'src/Entities/entities/UserRole';
@Module({
  imports: [
    TypeOrmModule.forFeature([Users, UserRole]),
    JwtModule.register({}),
    RedisModule,
    //MailModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
  //controllers: [UsersController],
})
export class UsersModule {}
