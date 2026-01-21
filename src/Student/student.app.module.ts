import { Module } from '@nestjs/common';
import { UsersModule } from './User/user.module';
import { AssignmentModule } from './Assignment/assignment.module';

@Module({
  imports: [UsersModule, AssignmentModule],
})
export class StudentAppModule {}
