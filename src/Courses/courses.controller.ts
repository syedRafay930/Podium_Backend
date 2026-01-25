import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  UseInterceptors,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { CourseService } from './courses.service';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplateService } from './template.service';
import { AddCourseDto } from './dto/add_course.dto';
import { UploadedFile } from '@nestjs/common';
import { CourseResponseDto } from 'src/common/dto/responses/course-response.dto';
import { PaginatedCoursesResponseDto } from 'src/common/dto/responses/paginated-courses-response.dto';
import { EditCourseDto } from './dto/edit_course.dto';
import { Res } from '@nestjs/common';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly templateService: TemplateService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Create new course', 
    description: 'Create a new course with course details and optional cover image. Only admins (role_id = 1) can create courses.' 
  })
  @ApiBody({ 
    type: AddCourseDto,
    description: 'Course information and cover image file. The image file should be sent as multipart/form-data with field name "image". All course fields are required except LongDescription, TeacherId, and image.',
    required: true,
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Course created successfully with cover image uploaded', 
    type: CourseResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data or missing required fields' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Only admins can create courses' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - Course category or teacher not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Course with the same name already exists' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error - Failed to create course or upload image' 
  })
  async createCourse(@Request() req, @Body() courseDto: AddCourseDto, @UploadedFile() file: Express.Multer.File) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can create courses');
    }
    // Note: The 'image' field in AddCourseDto is for Swagger documentation only.
    // FileInterceptor('image') extracts the file from multipart/form-data before it reaches this DTO.
    // The actual file is received via the @UploadedFile() parameter, not in courseDto.
    return this.courseService.createCourse(courseDto, req.user.id, file);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all courses', 
    description: 'Get paginated list of courses with optional filters for category and search. Supports pagination with page and limit parameters.' 
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Page number for pagination (starts from 1)', 
    example: 1 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of items per page', 
    example: 10 
  })
  @ApiQuery({ 
    name: 'category', 
    required: false, 
    type: String, 
    description: 'Filter courses by category ID', 
    example: '1' 
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    type: String, 
    description: 'Search courses by name (case-insensitive partial match)', 
    example: 'TypeScript' 
  })
  @ApiQuery({ 
    name: 'teacherId', 
    required: false, 
    type: String, 
    description: 'Filter courses by teacher ID', 
    example: '1' 
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of courses retrieved successfully',
    type: PaginatedCoursesResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getAllCourses(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.courseService.getAllCourses(+page, +limit, category, search, teacherId);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('assign-courses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get my courses for teachers', 
    description: 'Get paginated list of courses created by the authenticated user. Supports pagination with page and limit parameters.' 
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of user\'s courses retrieved successfully',
    type: PaginatedCoursesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getMyCoursesforTeachers(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.courseService.getAllCourses(+page, +limit, undefined, undefined, req.user.id.toString());
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get course by ID', 
    description: 'Get detailed course information including category, teacher, lectures, ratings, and statistics by course ID.' 
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Unique identifier of the course', 
    example: 1 
  })
  @ApiResponse({
    status: 200,
    description: 'Course details retrieved successfully with all related information',
    type: CourseResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid course ID format' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - Course with the specified ID does not exist' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getCourseById(@Request() req, @Param('id') courseId: number) {
    return this.courseService.getCourseById(courseId, req.user.id, req.user.role_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Update course', 
    description: 'Update an existing course with new details and optional cover image. Only admins (role_id = 1) can update courses.' 
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Course ID to update', 
    example: 1 
  })
  @ApiBody({ 
    type: EditCourseDto,
    description: 'Course information to update. All fields are optional. If image is provided, it will replace the existing cover image.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Course updated successfully', 
    type: CourseResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Only admins can update courses' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - Course not found' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error - Failed to update course or upload image' 
  })
  async updateCourse(
    @Request() req,
    @Param('id') courseId: number,
    @Body() courseDto: EditCourseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can update courses');
    }
    return this.courseService.updateCourse(courseId, courseDto, req.user.id, file);
  }

  @Get('categories/all')
  @ApiOperation({ 
    summary: 'Get all course categories', 
    description: 'Retrieve all course categories with course count. No authentication required.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories retrieved successfully',
    schema: {
      example: [
        {
          id: 1,
          name: 'Olevel',
        },
        {
          id: 2,
          name: 'Alevel',
        },
      ],
    },
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async getAllCategories() {
    return this.courseService.getAllCategories();
  }

  @UseGuards(JwtBlacklistGuard)
  @Post('assign-teacher/:courseId/:teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ 
    name: 'courseId', 
    type: 'number', 
    description: 'Course ID' 
  })
  @ApiParam({ 
    name: 'teacherId', 
    type: 'number', 
    description: 'Teacher ID (User with role_id = 2)' 
  })
  @ApiOperation({ 
    summary: 'Assign teacher to course', 
    description: 'Admin assigns a teacher to a course. Sets teacher_status to pending and sends email invitation to teacher with accept/reject buttons.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Teacher assigned successfully',
    schema: {
      example: {
        message: 'Teacher assigned to course. Invitation email sent to teacher@example.com',
        invitationToken: 'uuid-token-here',
      },
    },
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Only admins can assign teachers' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not found - Course or teacher not found' 
  })
  async assignTeacher(
    @Request() req,
    @Param('courseId') courseId: number,
    @Param('teacherId') teacherId: number,
  ) {
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can assign teachers to courses');
    }
    return this.courseService.assignTeacherToCourse(courseId, teacherId, req.user.id);
  }

  @Get(':courseId/teacher/action/:token')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ 
    name: 'courseId', 
    type: 'number', 
    description: 'Course ID' 
  })
  @ApiParam({ 
    name: 'token', 
    type: 'string', 
    description: 'Invitation token from email' 
  })
  @ApiQuery({ 
    name: 'action', 
    type: 'string', 
    enum: ['accept', 'reject'],
    description: 'Accept or reject the course assignment' 
  })
  @ApiOperation({ 
    summary: 'Handle teacher course assignment action (Email Link)', 
    description: 'Teacher accepts or rejects course assignment via email link. Returns HTML response.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Action completed successfully - returns HTML page' 
  })
  async handleTeacherActionFromEmail(
    @Param('courseId') courseId: number,
    @Param('token') token: string,
    @Query('action') action: 'accept' | 'reject',
    @Res() response,
  ) {
    const result = await this.courseService.handleTeacherAction(courseId, token, action);
    
    const isAccepted = action === 'accept';
    const statusColor = isAccepted ? '#28a745' : '#dc3545';
    const statusIcon = isAccepted ? '✓' : '✗';
    const statusText = isAccepted ? 'Accepted' : 'Rejected';
    const successMessage = isAccepted 
      ? '<p>✓ Thank you for accepting this course assignment! You can now access the course dashboard and start managing course content.</p>' 
      : '<p>✗ Your rejection has been recorded. The admin will be notified and will find another instructor for this course.</p>';
    
    const html = this.templateService.renderTemplate('teacher-action-response', {
      statusColor,
      statusIcon,
      statusText,
      message: result.message,
      courseId: courseId.toString(),
      courseName: result.courseName,
      timestamp: new Date().toLocaleString(),
      successMessage,
    });
    
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.send(html);
  }

  @Patch(':courseId/teacher/action/:token')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ 
    name: 'courseId', 
    type: 'number', 
    description: 'Course ID' 
  })
  @ApiParam({ 
    name: 'token', 
    type: 'string', 
    description: 'Invitation token from email' 
  })
  @ApiQuery({ 
    name: 'action', 
    type: 'string', 
    enum: ['accept', 'reject'],
    description: 'Accept or reject the course assignment' 
  })
  @ApiOperation({ 
    summary: 'Handle teacher course assignment action (API)', 
    description: 'Teacher accepts or rejects course assignment. Returns JSON response.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Action completed successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Invalid or expired invitation token' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token does not match the course' 
  })
  async handleTeacherAction(
    @Param('courseId') courseId: number,
    @Param('token') token: string,
    @Query('action') action: 'accept' | 'reject',
  ) {
    return await this.courseService.handleTeacherAction(courseId, token, action);
  }
}