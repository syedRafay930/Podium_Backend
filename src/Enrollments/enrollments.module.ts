import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { AdminEnrollmentsController } from './admin-enrollments.controller';
import { AuthModule } from '../Auth/auth.module';
import { Transactions } from 'src/Entities/entities/Transactions';
import { MailModule } from 'src/Nodemailer/mailer.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Courses, Users, Transactions]),
    AuthModule,
    MailModule
  ],
  controllers: [EnrollmentsController, AdminEnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}

