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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { RBACService } from './rbac.service';
import { UsersService } from 'src/Users/users.service';
import { ModuleDto } from 'src/common/dto/responses/module-response.dto';

@ApiTags('RBAC')
@Controller('admin/rbac')
export class RBACController {
  constructor(
    private readonly rbacService: RBACService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Get('get-modules')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all modules', 
    description: 'Retrieve all available modules with their hierarchical structure (parent-child relationships). Requires authentication.' 
  })
  @ApiResponse({
    status: 200,
    description: 'List of all modules with hierarchy retrieved successfully',
    type: [ModuleDto],
    isArray: true,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
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
  @ApiOperation({ 
    summary: 'Get sidebar modules by role', 
    description: 'Retrieve modules for sidebar navigation based on role permissions. Returns only modules enabled for the specified role with their hierarchical structure. This endpoint does not require authentication.' 
  })
  @ApiParam({ 
    name: 'roleId', 
    type: Number, 
    description: 'Role ID to get modules for', 
    example: 1 
  })
  @ApiResponse({
    status: 200,
    description: 'Sidebar modules for the role retrieved successfully',
    type: [ModuleDto],
    isArray: true,
    example: [
      {
        id: 1,
        name: 'Dashboard',
        is_enable: true,
        children: [
          {
            id: 2,
            name: 'Sub Module',
            is_enable: true
          }
        ]
      }
    ]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid role ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - Role with the specified ID does not exist' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getSidebarModules(@Param('roleId') roleId: number) {
    return this.rbacService.getModulesByRole(roleId);
  }

  //   @UseGuards(JwtBlacklistGuard)
  //   @Get('permissions-matrix')
  //   async getAllRolesPermissionMatrix() {
  //     return this.rbacService.getAllRolesPermissionMatrix();
  //   }
}
