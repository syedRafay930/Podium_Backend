import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/Entities/entities/Users';
import { Lectures } from 'src/Entities/entities/Lectures';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AuthModule } from '../Auth/auth.module';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { RedisModule } from '@nestjs-modules/ioredis';
import { LecturesModule } from 'src/Lectures/lectures.module';
import { Attendance } from 'src/Entities/entities/Attendance';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';


@Module({
  imports: [
    TypeOrmModule.forFeature([Users,  Lectures, Enrollment, Attendance, AttendanceDetails]), 
    AuthModule, 
    RedisModule,
    LecturesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}