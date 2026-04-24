import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { Transactions } from 'src/Entities/entities/Transactions';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transactions, Enrollment, Courses, Users]), AuthModule],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
