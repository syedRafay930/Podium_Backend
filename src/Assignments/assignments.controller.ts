import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  UseInterceptors,
  UploadedFiles,
  Res,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import axios from 'axios';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { GetAssignmentsQueryDto } from './dto/get-assignments-query.dto';
import { PaginatedAssignmentsResponseDto } from './dto/paginated-assignments-response.dto';
import { AssignmentResponseDto } from './dto/assignment-response.dto';
import { AssignmentDetailResponseDto } from './dto/assignment-detail-response.dto';
import { UploadSubmissionDto } from './dto/upload-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { PaginatedSubmissionsResponseDto } from './dto/assignment-submissions-response.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

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
  @UseInterceptors(FilesInterceptor('files', 10))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create new assignment',
    description:
      'Create a new assignment. Admins can create assignments for any course. Teachers can only create assignments for courses they are teaching. After creation, assignment_submission records are automatically created for all enrolled students with "missing" status. You can upload multiple files (up to 10) as assignment materials. Files will be uploaded to Cloudinary.',
  })
  @ApiBody({
    type: CreateAssignmentDto,
    description:
      'Assignment information. Files should be sent as multipart/form-data with field name "files". Multiple files can be uploaded (up to 10). Allowed file types: PDF, ZIP, Word (.doc, .docx), Excel (.xls, .xlsx), Text (.txt), PowerPoint (.ppt, .pptx). Maximum file size: 50MB per file.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or file validation failed',
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
  async createAssignment(
    @Request() req: any,
    @Body() createDto: CreateAssignmentDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    return this.assignmentsService.createAssignment(createDto, userId, roleId, files);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id/preview/:materialId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Preview assignment material file',
    description:
      'Preview an assignment material file (PDF) directly in the browser. The file is streamed from Cloudinary with proper headers for inline viewing. Access is role-based: Students can only preview files for assignments in courses they are enrolled in, Teachers can preview files for assignments they created or for courses they teach, Admins can preview all assignment files.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the assignment',
    example: 1,
  })
  @ApiParam({
    name: 'materialId',
    type: Number,
    description: 'Unique identifier of the assignment material',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'File stream for preview (PDF content)',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to preview this assignment file',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Assignment not found or assignment material not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to fetch file from Cloudinary',
  })
  async previewAssignmentFile(
    @Request() req: any,
    @Param('id') assignmentId: number,
    @Param('materialId', ParseIntPipe) materialId: number,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    try {
      // Validate access and get file metadata
      const { fileUrl, filename } =
        await this.assignmentsService.previewAssignmentFile(
          assignmentId,
          materialId,
          userId,
          roleId,
        );

      // Validate that fileUrl is a valid URL
      try {
        new URL(fileUrl);
      } catch (error) {
        throw new Error('Invalid file URL');
      }

      // Fetch file from Cloudinary with streaming
      const response = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status === 200,
      });

      // Set headers for inline PDF preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Pipe the stream to the response
      response.data.pipe(res);
    } catch (error) {
      // Handle NestJS HttpExceptions (NotFoundException, ForbiddenException, etc.)
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const message = error.message;
        res.status(status).json({
          statusCode: status,
          message: message,
        });
        return;
      }

      // Handle Axios errors (network errors, Cloudinary errors, etc.)
      if (error.response) {
        // Axios error with response (e.g., 404 from Cloudinary)
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Failed to fetch assignment file from storage',
        });
        return;
      }

      // Handle other errors (network timeouts, invalid URLs, etc.)
      if (error.message === 'Invalid file URL') {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid file URL format',
        });
        return;
      }

      // Generic error handler
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to preview assignment file. Please try again later.',
      });
    }
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get assignment by ID',
    description:
      'Get detailed assignment information by ID. Returns all assignment fields including description, full course details, and creator information. Access is role-based: Students can only view assignments for courses they are enrolled in, Teachers can view assignments they created or for courses they teach, Admins can view all assignments.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the assignment',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment details retrieved successfully',
    type: AssignmentDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have permission to view this assignment',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Assignment with the specified ID does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAssignmentById(@Request() req: any, @Param('id') assignmentId: number) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    return this.assignmentsService.getAssignmentById(assignmentId, userId, roleId);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get(':id/submissions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get assignment submissions',
    description:
      'Get all assignment submissions for a specific assignment. Only teachers who created the assignment or teach the course can access this endpoint. Returns a paginated table showing all enrolled students with their submission information (submission time, file URL, status). Students who have not submitted will show "missing" status.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the assignment',
    example: 1,
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
    description: 'Assignment submissions retrieved successfully',
    type: PaginatedSubmissionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only teachers can view submissions. Teacher must have created the assignment or teach the course.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Assignment with the specified ID does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAssignmentSubmissions(
    @Request() req: any,
    @Param('id') assignmentId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const pageNum = page || 1;
    const limitNum = limit || 10;

    return this.assignmentsService.getAssignmentSubmissions(
      assignmentId,
      userId,
      roleId,
      pageNum,
      limitNum,
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Post(':id/submit')
  @UseInterceptors(FilesInterceptor('files', 10))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload assignment submission',
    description:
      'Upload files for assignment submission. Only students enrolled in the course can submit. You can upload multiple files (up to 10). Allowed file types: PDF, ZIP, Word (.doc, .docx), Excel (.xls, .xlsx), Text (.txt), PowerPoint (.ppt, .pptx). Maximum file size: 50MB per file. The submission status will be automatically set to "submitted" or "late" based on the due date.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the assignment',
    example: 1,
  })
  @ApiBody({
    type: UploadSubmissionDto,
    description:
      'Assignment submission files. File field name must be "files". Multiple files can be uploaded (up to 10). Allowed types: PDF, ZIP, Word, Excel, Text, PowerPoint. Maximum size: 50MB per file.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment submitted successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid file type, file too large, or missing files',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only students can submit assignments, or student not enrolled in course',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Assignment not found, or submission record not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - File upload failed',
  })
  async uploadSubmission(
    @Request() req: any,
    @Param('id') assignmentId: number,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    return this.assignmentsService.uploadSubmission(
      assignmentId,
      userId,
      roleId,
      files || [],
    );
  }

  @UseGuards(JwtBlacklistGuard)
  @Patch(':id/submissions/:studentId/grade')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Grade assignment submission',
    description:
      'Grade a student\'s assignment submission. Only teachers who created the assignment or teach the course can grade submissions. When marks are provided, the submission status is automatically set to "graded". Marks cannot be negative and cannot exceed the assignment\'s total marks (if specified).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the assignment',
    example: 1,
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Unique identifier of the student',
    example: 5,
  })
  @ApiBody({
    type: GradeSubmissionDto,
    description: 'Grading details including marks obtained and optional comments',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission graded successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid marks (negative or exceeds total marks)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only teachers can grade submissions. Teacher must have created the assignment or teach the course.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Assignment not found or submission not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async gradeSubmission(
    @Request() req: any,
    @Param('id', ParseIntPipe) assignmentId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() gradeDto: GradeSubmissionDto,
  ) {
    const userId = req.user.id;
    const roleId = req.user.role_id;

    return this.assignmentsService.gradeSubmission(
      assignmentId,
      studentId,
      gradeDto,
      userId,
      roleId,
    );
  }
}

