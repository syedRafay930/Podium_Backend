import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Sections } from 'src/Entities/entities/Sections';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { AuthModule } from '../Auth/auth.module';
import { S3Module } from 'src/S3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resources, Courses, Sections, Enrollment]),
    AuthModule,
    S3Module,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}

