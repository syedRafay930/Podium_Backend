import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

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
      'Get all enrollments in the system. Only accessible by admins (role_id = 1).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can access this endpoint',
  })
  async getAllEnrollments(@Request() req) {
    const roleId = req.user.role_id;

    if (roleId !== 1) {
      throw new UnauthorizedException('Only admins can view all enrollments');
    }

    return this.enrollmentsService.getAllEnrollments();
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('course/:courseId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get enrollments for a specific course',
    description:
      'Get all students enrolled in a specific course. Accessible by admins (role_id = 1) and teachers (role_id = 2).',
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
    type: [EnrollmentResponseDto],
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
