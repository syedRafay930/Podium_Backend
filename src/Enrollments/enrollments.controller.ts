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
  Query,
  HttpCode,
  UseInterceptors,
  UploadedFile,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { EnrollmentsService } from './enrollments.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EditEnrollCourseDto } from './dto/edit_enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { MyEnrollmentRequestsQueryDto } from './dto/my-enrollment-requests-query.dto';
import { MyEnrollmentRequestsResponseDto } from './dto/my-enrollment-requests-response.dto';
import { MyCourseUpdatesQueryDto } from './dto/my-course-updates-query.dto';
import { MyCourseUpdatesResponseDto } from './dto/my-course-updates-response.dto';
import { StudentDashboardResponseDto } from './dto/student-dashboard-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { Multer } from 'multer';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post()
  @UseInterceptors(FileInterceptor('screenshot'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Enroll in a course',
    description:
      'Unified enrollment endpoint. Students can self-enroll, admins can enroll any student. Payment status is determined automatically based on role and course price.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Enrollment details (use multipart/form-data when uploading a screenshot)',
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'number', example: 1 },
        studentId: { type: 'number', example: 2 },
        screenshot: { type: 'string', format: 'binary' },
      },
      required: ['courseId'],
    },
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
  async enroll(
    @Request() req,
    @Body() enrollDto: EnrollCourseDto,
    @UploadedFile() screenshot?: Express.Multer.File,
  ) {
    const roleId = req.user.role_id;
    const userId = req.user.id;

    if (roleId === 1) {
      // Admin: direct enrollment, no screenshot needed
      if (!enrollDto.studentId) {
        throw new BadRequestException(
          'studentId is required when admin enrolls a student',
        );
      }
      return this.enrollmentsService.adminEnrollStudent(
        enrollDto.courseId,
        enrollDto.studentId,
        userId,
      );
    } else if (roleId === 3) {
      // Student: screenshot required for paid courses
      return this.enrollmentsService.studentSelfEnroll(
        enrollDto.courseId,
        userId,
        screenshot,
      );
    } else {
      throw new UnauthorizedException(
        'Only students and admins can enroll in courses',
      );
    }
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update enrollment status (Admin only)',
    description:
      'Update the status of a student enrollment. Only accessible by admins (role_id = 1).'
  })
  @ApiParam({ name: 'id', description: 'Enrollment ID to update', example: 1 })
  @ApiBody({ type: UpdateEnrollmentStatusDto, description: 'New enrollment status' })
  @ApiResponse({ status: 200, description: 'Enrollment status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can update enrollment status' })
  @ApiResponse({ status: 404, description: 'Not found - Enrollment not found' })
  async updateEnrollmentStatus(
    @Request() req,
    @Param('id', ParseIntPipe) enrollmentId: number,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException(
        'Only admins can approve or reject enrollments',
      );
    }

    return this.enrollmentsService.updateEnrollmentStatus(enrollmentId, dto);
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
      throw new UnauthorizedException(
        'Only students can view their enrolled courses',
      );
    }

    return this.enrollmentsService.myEnrolledCourses(req.user.id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('my-dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get student dashboard home data',
    description:
      'Aggregate payload for the student dashboard home: welcome name, key metrics, recent enrolled courses, pending enrollment requests, recent course material updates, and recent attendance. Real data only (no achievements/campus news).',
  })
  @ApiResponse({
    status: 200,
    description: 'Student dashboard data retrieved successfully',
    type: StudentDashboardResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only students can access this endpoint',
  })
  async myDashboard(@Request() req) {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException(
        'Only students can view the student dashboard',
      );
    }

    return this.enrollmentsService.myDashboard(req.user.id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('my-requests')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my enrollment requests (student)',
    description:
      'List all enrollment requests for the authenticated student with current status, course details, and payment/transaction info. Reflects admin approve/reject updates. Optional status filter: pending, enrolled, rejected, dismissed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student enrollment requests retrieved successfully',
    type: MyEnrollmentRequestsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only students can access this endpoint',
  })
  async myEnrollmentRequests(
    @Request() req,
    @Query() query: MyEnrollmentRequestsQueryDto,
  ) {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException(
        'Only students can view their enrollment requests',
      );
    }

    return this.enrollmentsService.myEnrollmentRequests(
      req.user.id,
      query.status,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('my-updates')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my course material updates (student)',
    description:
      'Recent course material uploads across enrolled courses (lectures, assignments, quizzes, resources). Newest first. Not a notification system — pull feed for student Updates tab.',
  })
  @ApiResponse({
    status: 200,
    description: 'Course material updates retrieved successfully',
    type: MyCourseUpdatesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only students, or not enrolled in filtered course',
  })
  async myCourseUpdates(
    @Request() req,
    @Query() query: MyCourseUpdatesQueryDto,
  ) {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException(
        'Only students can view course material updates',
      );
    }

    const allowedTypes = ['lecture', 'assignment', 'quiz', 'resource'] as const;
    const types = query.types
      ? query.types
          .split(',')
          .map((type) => type.trim().toLowerCase())
          .filter((type): type is (typeof allowedTypes)[number] =>
            (allowedTypes as readonly string[]).includes(type),
          )
      : undefined;

    return this.enrollmentsService.myCourseUpdates(req.user.id, {
      limit: query.limit ? +query.limit : undefined,
      courseId: query.courseId ? +query.courseId : undefined,
      types,
    });
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

    if (roleId !== 1) {
      // For students, verify they are dismissing themselves
      const enrollment =
        await this.enrollmentsService.getEnrollmentById(enrollmentId);
      if (enrollment.studentId !== userId) {
        throw new ForbiddenException(
          'You can only remove yourself from a course',
        );
      }
    }
    return this.enrollmentsService.dismissStudent(enrollmentId, dismissDto);
  }
}
