import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Student } from 'src/Entities/entities/Student';
import { Course } from 'src/Entities/entities/Course';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, AssignmentSubmission, Student, Course]),
  ],
  controllers: [],
  providers: [],
})
export class AssignmentModule {}
