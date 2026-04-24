import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/Entities/entities/Users';
import { Courses } from 'src/Entities/entities/Courses';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { Lectures } from 'src/Entities/entities/Lectures';
import { CourseService } from './courses.service';
import { CourseController } from './courses.controller';
import { AuthModule } from '../Auth/auth.module';
import { S3Module } from 'src/S3/s3.module';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Assignment } from 'src/Entities/entities/Assignment';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TemplateService } from './template.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Courses, CourseRating, Users, CourseCategory, Lectures, Enrollment, Assignment]), 
    AuthModule, 
    S3Module,
    MailModule,
    RedisModule,
  ],
  controllers: [CourseController],
  providers: [CourseService, TemplateService],
  exports: [CourseService],
})
export class CourseModule {}