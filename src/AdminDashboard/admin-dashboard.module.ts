import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/Auth/auth.module';
import { Users } from 'src/Entities/entities/Users';
import { Courses } from 'src/Entities/entities/Courses';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Transactions } from 'src/Entities/entities/Transactions';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Attendance } from 'src/Entities/entities/Attendance';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      Courses,
      Enrollment,
      Transactions,
      AssignmentSubmission,
      Attendance,
    ]),
    AuthModule,
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
