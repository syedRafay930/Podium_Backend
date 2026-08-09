import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Query,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { EnrollmentsService } from './enrollments.service';
import { AdminEnrollmentsListResponseDto } from './dto/admin-enrollments-response.dto';

@ApiTags('Admin Enrollments')
@Controller('admin/enrollments')
export class AdminEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtBlacklistGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all enrollments (Admin)',
    description:
      'Admin only - Paginated enrollments with student/course/transaction details, filters, and status stats for review (approve/reject).',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'enrolled', 'rejected', 'dismissed'],
    description: 'Filter by enrollment status',
  })
  @ApiQuery({
    name: 'studentName',
    required: false,
    type: String,
    description: 'Search by student full name',
    example: 'Ali Khan',
  })
  @ApiQuery({
    name: 'courseName',
    required: false,
    type: String,
    description: 'Search by course name',
    example: 'Web Development',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    type: Number,
    description: 'Filter by course ID',
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments retrieved successfully',
    type: AdminEnrollmentsListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can access this endpoint',
  })
  async getAllEnrollments(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status')
    status?: 'pending' | 'enrolled' | 'rejected' | 'dismissed',
    @Query('studentName') studentName?: string,
    @Query('courseName') courseName?: string,
    @Query('courseId') courseId?: number,
  ) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view all enrollments');
    }

    return this.enrollmentsService.getAllEnrollments(
      +page,
      +limit,
      status,
      studentName,
      courseName,
      courseId ? +courseId : undefined,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('course/:courseId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get enrollments for a specific course',
    description:
      'Get formatted enrollments for a course with payment/transaction info and status stats. Accessible by admins and teachers.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments for the course retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins and teachers can access this endpoint',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async studentsInCourse(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    const roleId = req.user.role_id;

    if (roleId !== 1 && roleId !== 2) {
      throw new UnauthorizedException(
        'Only admins and teachers can view course enrollments',
      );
    }

    return this.enrollmentsService.studentsInCourse(courseId);
  }
}
