import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { QuizAttempts } from 'src/Entities/entities/QuizAttempts';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { StudentLectureProgress } from 'src/Entities/entities/StudentLectureProgress';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { ProgressService } from './progress.service';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lectures,
      Assignment,
      AssignmentSubmission,
      Quizzes,
      QuizAttempts,
      Enrollment,
      StudentLectureProgress,
      AttendanceDetails,
    ]),
    AuthModule,
  ],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
