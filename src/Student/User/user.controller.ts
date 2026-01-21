import {
  Get,
  Controller,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './user.service';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { CourseService } from 'src/Admin/Course/course.service';
import { PaginatedCoursesResponseDto } from 'src/common/dto/responses/paginated-courses-response.dto';
import { CourseResponseDto } from 'src/common/dto/responses/course-response.dto';

@ApiTags('Student Courses')
@Controller()
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly courseService: CourseService,
  ) {}

  @UseGuards(JwtBlacklistGuard)
  @Get('all-courses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all courses', description: 'Get paginated list of courses with optional filters (Student only)' })
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
  @Get('course/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course by ID', description: 'Get detailed course information by ID (Student only)' })
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
