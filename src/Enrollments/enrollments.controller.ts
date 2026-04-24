import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { EnrollmentsService } from './enrollments.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EditEnrollCourseDto } from './dto/edit_enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Enroll in a course',
    description:
      'Unified enrollment endpoint. Students can self-enroll, admins can enroll any student. Payment status is determined automatically based on role and course price.',
  })
  @ApiBody({
    type: EnrollCourseDto,
    description: 'Enrollment details',
  })
  @ApiResponse({
    status: 201,
    description: 'Enrollment created successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or invalid role',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Unauthorized role access',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course or student not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Student is already enrolled in this course',
  })
  async enroll(@Request() req, @Body() enrollDto: EnrollCourseDto) {
    const roleId = req.user.role_id;
    const userId = req.user.id;

    let studentId: number;
    let status: 'pending' | 'enrolled' | undefined;

    if (roleId === 1) {
      // Admin enrollment
      if (!enrollDto.studentId) {
        throw new BadRequestException(
          'studentId is required when admin enrolls a student',
        );
      }
      studentId = enrollDto.studentId;
      status = 'enrolled'; 
    } else if (roleId === 3) {
      // Student self-enrollment
      studentId = userId;
      status = 'pending';
    } else {
      throw new UnauthorizedException(
        'Only students and admins can enroll in courses',
      );
    }

    return this.enrollmentsService.enrollStudent(
      enrollDto.courseId,
      studentId,
      userId,
      roleId,
      status,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('my-courses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my enrolled courses',
    description:
      'Get all courses enrolled by the authenticated student. Only accessible by students (role_id = 3).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of enrolled courses retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only students can access this endpoint',
  })
  async myEnrolledCourses(@Request() req) {
    const roleId = req.user.role_id;

    if (roleId !== 3) {
      throw new UnauthorizedException('Only students can view their enrolled courses');
    }

    return this.enrollmentsService.myEnrolledCourses(req.user.id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch(':enrollmentId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Dismiss student from course',
    description:
      'Remove a student from a course. Admin can remove any student, students can only remove themselves from a course.',
  })
  @ApiParam({
    name: 'enrollmentId',
    description: 'Enrollment ID to dismiss',
    example: 1,
  })
  @ApiBody({
    type: EditEnrollCourseDto,
    description: 'Enrollment update details',
  })
  @ApiResponse({
    status: 200,
    description: 'Student dismissed from course successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only remove yourself from a course',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Enrollment not found',
  })
  async dismissStudent(
    @Request() req,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Body() dismissDto: EditEnrollCourseDto,
  ) {
    const roleId = req.user.role_id;
    const userId = req.user.id;

    if (roleId !== 1 ) {
      // For students, verify they are dismissing themselves
      const enrollment = await this.enrollmentsService.getEnrollmentById(enrollmentId);
      if (enrollment.studentId !== userId) {
        throw new ForbiddenException(
          'You can only remove yourself from a course',
        );
      }
    }
    return this.enrollmentsService.dismissStudent(enrollmentId, dismissDto);
  }
}

