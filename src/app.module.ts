import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MailerModule } from '@nestjs-modules/mailer';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './Auth/auth.module';
import { UsersModule } from './Users/users.module';
import { CourseModule } from './Courses/courses.module';
import { EnrollmentsModule } from './Enrollments/enrollments.module';
import { AssignmentsModule } from './Assignments/assignments.module';
import { FeesModule } from './Fees/fees.module';
import { CourseManagementModule } from './CourseManagement/course-management.module';
import { ResourcesModule } from './Resources/resources.module';
import { GoogleCalendarModule } from './GoogleCalendar/google-calendar.module';
import { LecturesModule } from './Lectures/lectures.module';
import { AttendanceModule } from './Attendance/attendance.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      synchronize: false,
    }),

    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL') || 'redis://localhost:6380',
      }),
    }),

    AuthModule,
    UsersModule,
    CourseModule,
    EnrollmentsModule,
    AssignmentsModule,
    FeesModule,
    CourseManagementModule,
    ResourcesModule,
    GoogleCalendarModule,
    LecturesModule,
    AttendanceModule,
  ],
})
export class AppModule {}
