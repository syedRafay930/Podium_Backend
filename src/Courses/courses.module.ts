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
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Assignment } from 'src/Entities/entities/Assignment';


@Module({
  imports: [TypeOrmModule.forFeature([Courses, CourseRating, Users, CourseCategory, Lectures, Enrollment, Assignment]), AuthModule, CloudinaryModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}