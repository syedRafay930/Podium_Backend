import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { GetAssignmentsQueryDto } from './dto/get-assignments-query.dto';
import { PaginatedAssignmentsResponseDto } from './dto/paginated-assignments-response.dto';
import { AssignmentResponseDto } from './dto/assignment-response.dto';

@ApiTags('Assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @UseGuards(JwtBlacklistGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all assignments',
    description:
      'Get paginated list of assignments with optional filters for course and status. Access is role-based: Students see assignments for enrolled courses, Teachers see assignments they created or for courses they teach, Admins see all assignments.',
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
  @ApiQuery({
    name: 'courseId',
    required: false,
    type: Number,
    description: 'Filter assignments by course ID',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['missing', 'submitted', 'graded', 'late'],
    description: 'Filter by assignment submission status',
    example: 'missing',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of assignments retrieved successfully',
    type: PaginatedAssignmentsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Invalid role',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAssignments(
    @Request() req: any,
    @Query() query: GetAssignmentsQueryDto,
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const page = query.page || 1;
    const limit = query.limit || 10;

    return this.assignmentsService.getAssignments(
      userId,
      roleId,
      page,
      limit,
      query.courseId,
      query.status,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create new assignment',
    description:
      'Create a new assignment. Admins can create assignments for any course. Teachers can only create assignments for courses they are teaching. After creation, assignment_submission records are automatically created for all enrolled students with "missing" status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
    type: AssignmentResponseDto,
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
    description:
      'Forbidden - Only admins and teachers can create assignments. Teachers can only create for courses they teach.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createAssignment(@Request() req: any, @Body() createDto: CreateAssignmentDto) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    return this.assignmentsService.createAssignment(createDto, userId, roleId);
  }
}

