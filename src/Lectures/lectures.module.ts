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
import { CloudinaryModule } from 'src/Cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lectures, Courses, Sections, Users]),
    GoogleCalendarModule,
    AuthModule,
    CloudinaryModule,
  ],
  controllers: [LecturesController],
  providers: [LecturesService],
  exports: [LecturesService],
})
export class LecturesModule {}
