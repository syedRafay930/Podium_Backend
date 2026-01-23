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
  HttpStatus,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { UsersService } from './users.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { EditStudentDto } from './dto/edit-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { EditTeacherDto } from './dto/edit-teacher.dto';

@ApiTags('Admin - Users Management')
@Controller('admin/users')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== STUDENT ENDPOINTS ====================

  @Post('students')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new student',
    description: 'Admin only - Create a new student account with email and password',
  })
  @ApiBody({
    type: CreateStudentDto,
    description: 'Student creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
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
    description: 'Forbidden - Only admins can create students',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async createStudent(@Request() req, @Body() createStudentDto: CreateStudentDto) {
    // Check if user is admin (role_id = 1)
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can create students');
    }

    return this.usersService.createStudent(createStudentDto, req.user.id);
  }

  @Get('students')
  @ApiOperation({
    summary: 'Get all students',
    description: 'Admin only - Get paginated list of all students',
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
  @ApiResponse({
    status: 200,
    description: 'List of students retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view students',
  })
  async getAllStudents(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view students');
    }

    return this.usersService.getAllStudents(+page, +limit);
  }

  @Get('students/:studentId')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'Admin only - Get detailed information about a specific student',
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Student ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Student details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view student details',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Student not found',
  })
  async getStudentById(@Request() req, @Param('studentId', ParseIntPipe) studentId: number) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view student details');
    }

    return this.usersService.getStudentById(studentId);
  }

  @Patch('students/:studentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update student',
    description: 'Admin only - Update student information (name, email, password, status)',
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Student ID to update',
    example: 1,
  })
  @ApiBody({
    type: EditStudentDto,
    description: 'Student update details (all fields optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
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
    description: 'Forbidden - Only admins can update students',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Student not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async updateStudent(
    @Request() req,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() editStudentDto: EditStudentDto,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can update students');
    }

    return this.usersService.updateStudent(studentId, editStudentDto, req.user.id);
  }

  @Delete('students/:studentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete student',
    description: 'Admin only - Soft delete a student (mark as deleted)',
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Student ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Student deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can delete students',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Student not found',
  })
  async deleteStudent(
    @Request() req,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can delete students');
    }

    return this.usersService.deleteStudent(studentId, req.user.id);
  }

  // ==================== TEACHER ENDPOINTS ====================

  @Post('teachers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new teacher',
    description: 'Admin only - Create a new teacher account with email and password',
  })
  @ApiBody({
    type: CreateTeacherDto,
    description: 'Teacher creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Teacher created successfully',
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
    description: 'Forbidden - Only admins can create teachers',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async createTeacher(@Request() req, @Body() createTeacherDto: CreateTeacherDto) {
    // Check if user is admin (role_id = 1)
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can create teachers');
    }

    return this.usersService.createTeacher(createTeacherDto, req.user.id);
  }

  @Get('teachers')
  @ApiOperation({
    summary: 'Get all teachers',
    description: 'Admin only - Get paginated list of all teachers',
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
  @ApiResponse({
    status: 200,
    description: 'List of teachers retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view teachers',
  })
  async getAllTeachers(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view teachers');
    }

    return this.usersService.getAllTeachers(+page, +limit);
  }

  @Get('teachers/:teacherId')
  @ApiOperation({
    summary: 'Get teacher by ID',
    description: 'Admin only - Get detailed information about a specific teacher',
  })
  @ApiParam({
    name: 'teacherId',
    type: Number,
    description: 'Teacher ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view teacher details',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Teacher not found',
  })
  async getTeacherById(@Request() req, @Param('teacherId', ParseIntPipe) teacherId: number) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view teacher details');
    }

    return this.usersService.getTeacherById(teacherId);
  }

  @Patch('teachers/:teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update teacher',
    description: 'Admin only - Update teacher information (name, email, password, status)',
  })
  @ApiParam({
    name: 'teacherId',
    type: Number,
    description: 'Teacher ID to update',
    example: 1,
  })
  @ApiBody({
    type: EditTeacherDto,
    description: 'Teacher update details (all fields optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher updated successfully',
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
    description: 'Forbidden - Only admins can update teachers',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Teacher not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async updateTeacher(
    @Request() req,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Body() editTeacherDto: EditTeacherDto,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can update teachers');
    }

    return this.usersService.updateTeacher(teacherId, editTeacherDto, req.user.id);
  }

  @Delete('teachers/:teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete teacher',
    description: 'Admin only - Soft delete a teacher (mark as deleted)',
  })
  @ApiParam({
    name: 'teacherId',
    type: Number,
    description: 'Teacher ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can delete teachers',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Teacher not found',
  })
  async deleteTeacher(
    @Request() req,
    @Param('teacherId', ParseIntPipe) teacherId: number,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can delete teachers');
    }

    return this.usersService.deleteTeacher(teacherId, req.user.id);
  }
}
