import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
//import { UsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from '../Auth/auth.module';
//import { MailModule } from 'src/Nodemailer/mailer.module';
import { Student } from 'src/Entities/entities/Student';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { CourseModule } from 'src/Admin/Course/course.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Student, AssignmentSubmission]),
    JwtModule.register({}),
    RedisModule,
    CourseModule,
    //MailModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
  //controllers: [UsersController],
})
export class UsersModule {}
