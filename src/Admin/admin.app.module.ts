import { Module } from "@nestjs/common";
import { UsersModule } from "./User/user.module";
import { CourseModule } from "./Course/course.module";

@Module({
  imports: [UsersModule, CourseModule],
})
export class AdminAppModule {}