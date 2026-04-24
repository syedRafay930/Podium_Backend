import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sections } from 'src/Entities/entities/Sections';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Assignment } from 'src/Entities/entities/Assignment';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { CourseManagementController } from './course-management.controller';
import { CourseManagementService } from './course-management.service';
import { AuthModule } from '../Auth/auth.module';
import { S3Module } from '../S3/s3.module';
import { Quizzes } from 'src/Entities/entities/Quizzes';

//import { ResourcesModule } from '../Resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sections, Resources, Courses, Users, Assignment, Lectures, Enrollment, Quizzes]),
    AuthModule,
    S3Module,
    //ResourcesModule,
  ],
  controllers: [CourseManagementController],
  providers: [CourseManagementService],
  exports: [CourseManagementService],
})
export class CourseManagementModule {}
