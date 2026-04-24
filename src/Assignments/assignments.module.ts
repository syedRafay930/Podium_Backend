import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { AssignmentMaterial } from 'src/Entities/entities/AssignmentMaterial';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { AuthModule } from 'src/Auth/auth.module';
import { S3Module } from 'src/S3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      AssignmentSubmission,
      Courses,
      Users,
      Enrollment,
      AssignmentMaterial,
    ]),
    AuthModule,
    S3Module,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}

