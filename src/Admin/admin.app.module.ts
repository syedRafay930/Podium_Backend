import { Module } from "@nestjs/common";
import { AuthModule } from "./Auth/auth.module";
import { UsersModule } from "./User/user.module";
import { CourseModule } from "./Course/course.module";

@Module({
  imports: [AuthModule, UsersModule, CourseModule],
})
export class AdminAppModule {}