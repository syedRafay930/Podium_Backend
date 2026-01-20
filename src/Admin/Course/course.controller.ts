import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Query,
  Param,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CourseService } from './course.service';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { AddCourseDto } from './dto/add_course.dto';
import { CourseResponseDto } from 'src/common/dto/responses/course-response.dto';
import { PaginatedCoursesResponseDto } from 'src/common/dto/responses/paginated-courses-response.dto';

@ApiTags('Admin Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new course', description: 'Create a new course (Admin only)' })
  @ApiBody({ type: AddCourseDto })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Course category or teacher not found' })
  @ApiResponse({ status: 409, description: 'Course already exists' })
  async createCourse(@Request() req, @Body() courseDto: AddCourseDto) {
    return this.courseService.createCourse(courseDto, req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all courses', description: 'Get paginated list of courses with optional filters (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category ID', example: '1' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by course name', example: 'TypeScript' })
  @ApiResponse({
    status: 200,
    description: 'List of courses retrieved successfully',
    type: PaginatedCoursesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAllCourses(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.courseService.getAllCourses(+page, +limit, category, search);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course by ID', description: 'Get detailed course information by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Course ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Course details retrieved successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseById(@Param('id') courseId: number) {
    return this.courseService.getCourseById(courseId);
  }
}
