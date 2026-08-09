import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from '../Auth/auth.module';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { Users } from 'src/Entities/entities/Users';
import { UserRole } from 'src/Entities/entities/UserRole';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { Courses } from 'src/Entities/entities/Courses';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Attendance } from 'src/Entities/entities/Attendance';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      UserRole,
      Enrollment,
      AttendanceDetails,
      Courses,
      AssignmentSubmission,
      Attendance,
    ]),
    JwtModule.register({}),
    RedisModule,
    MailModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController],
})
export class UsersModule {}
