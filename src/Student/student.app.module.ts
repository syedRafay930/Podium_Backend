import { Module } from '@nestjs/common';
import { UsersModule } from './User/user.module';
import { AuthModule } from './Auth/auth.module';
import { AssignmentModule } from './Assignment/assignment.module';

@Module({
  imports: [UsersModule, AuthModule, AssignmentModule],
})
export class StudentAppModule {}
