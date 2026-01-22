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
import { CloudinaryModule } from 'src/Cloudinary/cloudinary.module';
//import { EnrolledCourses } from 'src/Entities/entities/EnrolledCourses';

@Module({
  imports: [TypeOrmModule.forFeature([Courses, CourseRating, Users, CourseCategory, Lectures]), AuthModule, CloudinaryModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}