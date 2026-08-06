import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Assignment } from 'src/Entities/entities/Assignment';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { Resources } from 'src/Entities/entities/Resources';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { AdminEnrollmentsController } from './admin-enrollments.controller';
import { AuthModule } from '../Auth/auth.module';
import { Transactions } from 'src/Entities/entities/Transactions';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { S3Module } from 'src/S3/s3.module';
import { ProgressModule } from 'src/Progress/progress.module';
import { AttendanceModule } from 'src/Attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Courses,
      Users,
      Transactions,
      Lectures,
      Assignment,
      Quizzes,
      Resources,
    ]),
    AuthModule,
    MailModule,
    S3Module,
    ProgressModule,
    AttendanceModule,
  ],
  controllers: [EnrollmentsController, AdminEnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
