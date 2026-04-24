import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Courses } from 'src/Entities/entities/Courses';
import { Sections } from 'src/Entities/entities/Sections';
import { Users } from 'src/Entities/entities/Users';
import { LecturesController } from './lectures.controller';
import { LecturesService } from './lectures.service';
import { GoogleCalendarModule } from 'src/GoogleCalendar/google-calendar.module';
import { AuthModule } from 'src/Auth/auth.module';
import { S3Module } from 'src/S3/s3.module';
import { Attendance } from 'src/Entities/entities/Attendance';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { Enrollment } from 'src/Entities/entities/Enrollment';
@Module({
  imports: [
    TypeOrmModule.forFeature([Lectures, Courses, Sections, Users, Attendance, AttendanceDetails, Enrollment]),
    GoogleCalendarModule,
    AuthModule,
    S3Module,
  ],
  controllers: [LecturesController],
  providers: [LecturesService],
  exports: [LecturesService],
})
export class LecturesModule {}
