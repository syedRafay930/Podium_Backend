import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/Entities/entities/Admin';
import { Course } from 'src/Entities/entities/Course';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Teacher } from 'src/Entities/entities/Teacher';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { Lecture } from 'src/Entities/entities/Lecture';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { AuthModule } from '../Auth/auth.module';


@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseRating, Admin, Teacher, CourseCategory, Lecture]), AuthModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
