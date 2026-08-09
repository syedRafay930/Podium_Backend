import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { CourseService } from './courses.service';
import { AdminTeacherAssignmentsListResponseDto } from './dto/admin-teacher-assignments-response.dto';

@ApiTags('Admin - Teacher Assignments')
@Controller('admin/teacher-assignments')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class AdminTeacherAssignmentsController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @ApiOperation({
    summary: 'List teacher course assignments (Admin)',
    description:
      'Admin queue for course teaching assignments: pending invitations, accepted, rejected, and unassigned courses. Use with POST /courses/assign-teacher/:courseId/:teacherId to assign/reassign.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'accepted', 'rejected', 'unassigned'],
    description: 'Filter by assignment status',
  })
  @ApiQuery({
    name: 'teacherName',
    required: false,
    type: String,
    example: 'Sara Ahmed',
  })
  @ApiQuery({
    name: 'courseName',
    required: false,
    type: String,
    example: 'Web Development',
  })
  @ApiQuery({
    name: 'teacherId',
    required: false,
    type: Number,
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher assignments retrieved successfully',
    type: AdminTeacherAssignmentsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTeacherAssignments(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status')
    status?: 'pending' | 'accepted' | 'rejected' | 'unassigned',
    @Query('teacherName') teacherName?: string,
    @Query('courseName') courseName?: string,
    @Query('teacherId') teacherId?: number,
  ) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException(
        'Only admins can view teacher assignments',
      );
    }

    return this.courseService.getAdminTeacherAssignments(
      +page,
      +limit,
      status,
      teacherName,
      courseName,
      teacherId ? +teacherId : undefined,
    );
  }
}
