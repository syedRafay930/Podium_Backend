import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCredentials } from 'src/Entities/entities/GoogleCredentials';
import { Users } from 'src/Entities/entities/Users';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([GoogleCredentials, Users]), AuthModule],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}

