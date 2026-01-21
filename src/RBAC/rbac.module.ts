import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RBACService } from './rbac.service';
import { RBACController } from './rbac.controller';
import { Modules } from 'src/Entities/entities/Modules';
import { RelationModule } from 'src/Entities/entities/RelationModule';
import { RolePermissions } from 'src/Entities/entities/RolePermissions';
import { UsersModule } from 'src/Users/users.module';
import { AuthModule } from 'src/Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Modules,
      RelationModule,
      RolePermissions,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  providers: [RBACService],
  controllers: [RBACController],
  exports: [RBACService, TypeOrmModule],
})
export class RBACModule {}
