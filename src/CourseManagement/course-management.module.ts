import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sections } from 'src/Entities/entities/Sections';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Assignment } from 'src/Entities/entities/Assignment';
import { CourseManagementController } from './course-management.controller';
import { CourseManagementService } from './course-management.service';
import { AuthModule } from '../Auth/auth.module';
import { CloudinaryModule } from '../Cloudinary/cloudinary.module';
import { ResourcesModule } from '../Resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sections, Resources, Courses, Users, Assignment]),
    AuthModule,
    CloudinaryModule,
    ResourcesModule,
  ],
  controllers: [CourseManagementController],
  providers: [CourseManagementService],
  exports: [CourseManagementService],
})
export class CourseManagementModule {}

