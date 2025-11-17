import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
//import { UsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from '../Auth/auth.module';
//import { MailModule } from 'src/Nodemailer/mailer.module';
import { Student } from 'src/Entities/entities/Student';
@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
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
