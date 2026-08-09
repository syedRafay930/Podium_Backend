import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';

@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin platform dashboard',
    description:
      'Aggregate platform summary for admin home: metrics (students, teachers, courses, enrollments, teacher assignments, revenue, workload), action-required queues, recent activity, and chart series.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard retrieved successfully',
    type: AdminDashboardResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getDashboard(@Request() req) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view the admin dashboard');
    }

    return this.adminDashboardService.getDashboard(req.user.id);
  }
}
