import { Module } from "@nestjs/common";
import { UsersModule } from "./User/user.module";
import { AuthModule } from "./Auth/auth.module";

@Module({
  imports: [UsersModule, AuthModule],
})
export class StudentAppModule {}