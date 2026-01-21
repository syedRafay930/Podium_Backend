import {
  Body,
  Controller,
  Post,
  Get,
  Request,
  UseGuards,
  ForbiddenException,
  Param,
  Put,
  Patch,
} from '@nestjs/common';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { RBACService } from './rbac.service';
import { UsersService } from 'src/Users/users.service';

@Controller('admin/rbac')
export class RBACController {
  constructor(
    private readonly rbacService: RBACService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Get('get-modules')
  async getModules() {
    return await this.rbacService.getModules();
  }

  //   @UseGuards(JwtBlacklistGuard)
  //   @Post('assign-permissions')
  //   async assignPermissions(
  //     @Body() dto: AssignPermissionDto,
  //     @Request() req: any,
  //   ) {
  //     if (!req.user || req.user.admin_role !== 1) {
  //       throw new ForbiddenException('Only SuperAdmin can assign permissions.');
  //     }
  //     return this.rbacService.assignPermissions(
  //       dto.role_id,
  //       dto.module_id,
  //       dto.is_enable,
  //       req.user.admin_id,
  //     );
  //   }

  @Get('sidebar/:roleId')
  async getSidebarModules(@Param('roleId') roleId: number) {
    return this.rbacService.getModulesByRole(roleId);
  }

  //   @UseGuards(JwtBlacklistGuard)
  //   @Get('permissions-matrix')
  //   async getAllRolesPermissionMatrix() {
  //     return this.rbacService.getAllRolesPermissionMatrix();
  //   }
}
