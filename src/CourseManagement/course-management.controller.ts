import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { CourseManagementService } from './course-management.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateResourceDto } from '../Resources/dto/create-resource.dto';
import { UpdateResourceDto } from '../Resources/dto/update-resource.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { SectionWithContentResponseDto } from './dto/section-with-content-response.dto';
import { ResourceListResponseDto } from 'src/Resources/dto/resource-list-response.dto';

@ApiTags('Course Management')
@Controller('courses')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class CourseManagementController {
  constructor(
    private readonly courseManagementService: CourseManagementService,
  ) {}

  // Section Management Endpoints

  @Post(':courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new section',
    description:
      'Create a section for a course. Only teachers teaching the course and admins can create sections.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiBody({
    type: CreateSectionDto,
    description: 'Section creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Section created successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can create sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async createSection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() createSectionDto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot create sections');
    }

    return this.courseManagementService.createSection(
      courseId,
      createSectionDto,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/sections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all sections for a course',
    description:
      'Get all sections for a course. Only teachers teaching the course and admins can access.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Sections retrieved successfully',
    type: [SectionResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can view sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async getSectionsByCourse(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<SectionResponseDto[]> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view sections');
    }

    return this.courseManagementService.getSectionsByCourse(
      courseId,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/sections/with-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all sections with their content (assignments, lectures, resources)',
    description:
      'Get all sections for a course with their associated assignments, lectures, and resources grouped by section. Only teachers teaching the course and admins can access.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Sections with content retrieved successfully',
    type: [SectionWithContentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can view sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async getSectionByCourseIdWithContent(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<SectionWithContentResponseDto[]> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view sections');
    }

    return this.courseManagementService.getSectionByCourseIdWithContent(
      courseId,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/with-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get course by ID with all content',
    description:
      'Get complete course details with sections grouped by content (assignments, lectures, resources). For teachers and admins, includes enrollment list. For students, includes only course structure and content.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Course with content retrieved successfully',
    schema: {
      example: {
        course: { id: 1, title: 'Course Title', teacher: {} },
        sections: [],
        enrollments: [], // Only for admin/teacher
        enrollmentCount: 0, // Only for admin/teacher
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async getCourseByIdWithContent(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.courseManagementService.getCourseByIdWithContent(
      courseId,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific section',
    description:
      'Get a specific section with its subsections and resources. Only teachers teaching the course and admins can access.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiParam({
    name: 'sectionId',
    type: Number,
    description: 'Section ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Section retrieved successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can view sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async getSectionById(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ): Promise<SectionResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view sections');
    }

    const section = await this.courseManagementService[
      'validateSectionBelongsToCourse'
    ](sectionId, courseId);

    return this.courseManagementService['mapSectionToDto'](section);
  }

  @Patch(':courseId/sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a section',
    description:
      'Update section title or description. Only teachers teaching the course and admins can update sections.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiParam({
    name: 'sectionId',
    type: Number,
    description: 'Section ID to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateSectionDto,
    description: 'Section update details (all fields optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Section updated successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can update sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async updateSection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() updateSectionDto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot update sections');
    }

    return this.courseManagementService.updateSection(
      sectionId,
      courseId,
      updateSectionDto,
      req.user.id,
      req.user.role_id,
    );
  }

  @Delete(':courseId/sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a section',
    description:
      'Delete a section. By default, resources and assignments are preserved (sectionId set to NULL). Use query parameter deleteAssignments=true to also delete assignments and their submissions. Only teachers teaching the course and admins can delete sections.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiParam({
    name: 'sectionId',
    type: Number,
    description: 'Section ID to delete',
    example: 1,
  })
  @ApiQuery({
    name: 'deleteAssignments',
    required: false,
    type: Boolean,
    description:
      'If true, also delete assignments and their submissions. Default: false',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Section deleted successfully',
    schema: {
      example: { message: 'Section deleted successfully' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can delete sections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async deleteSection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('deleteAssignments') deleteAssignments?: string,
  ): Promise<{ message: string }> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot delete sections');
    }

    const shouldDeleteAssignments = deleteAssignments === 'true';

    return this.courseManagementService.deleteSection(
      sectionId,
      courseId,
      req.user.id,
      req.user.role_id,
      shouldDeleteAssignments,
    );
  }
}
