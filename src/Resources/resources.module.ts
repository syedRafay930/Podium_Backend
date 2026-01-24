import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Sections } from 'src/Entities/entities/Sections';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { AuthModule } from '../Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resources, Courses, Sections, Enrollment]),
    AuthModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}

