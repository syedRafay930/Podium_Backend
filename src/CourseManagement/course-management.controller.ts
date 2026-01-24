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
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { SectionResponseDto } from './dto/section-response.dto';
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
    summary: 'Create a new section (chapter)',
    description:
      'Create a top-level section for a course. Only teachers teaching the course and admins can create sections.',
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

  @Post(':courseId/sections/:sectionId/subsections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a subsection',
    description:
      'Create a subsection under a parent section. Only teachers teaching the course and admins can create subsections.',
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
    description: 'Parent section ID',
    example: 1,
  })
  @ApiBody({
    type: CreateSectionDto,
    description: 'Subsection creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Subsection created successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can create subsections',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course or section not found',
  })
  async createSubsection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createSectionDto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot create subsections');
    }

    return this.courseManagementService.createSubsection(
      courseId,
      sectionId,
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
      'Get all sections (chapters) and subsections for a course in hierarchical structure. Only teachers teaching the course and admins can access.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiQuery({
    name: 'includeResources',
    required: false,
    type: Boolean,
    description: 'Include resources in the response',
    example: false,
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
    @Query('includeResources') includeResources?: string,
  ): Promise<SectionResponseDto[]> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view sections');
    }

    return this.courseManagementService.getSectionsByCourse(
      courseId,
      req.user.id,
      req.user.role_id,
      includeResources === 'true',
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

    return this.courseManagementService.getSectionById(
      sectionId,
      req.user.id,
      req.user.role_id,
    );
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
    description: 'If true, also delete assignments and their submissions. Default: false',
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
      req.user.id,
      req.user.role_id,
      shouldDeleteAssignments,
    );
  }

  // Resource Management Endpoints

  @Post(':courseId/resources')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a resource directly attached to a course',
    description:
      'Add a resource directly to a course (not attached to any section). Accepts file upload (PDF, PPT, DOCS, TXT, etc.). PPT, DOCS, and TXT files are automatically mapped to "document" resource type. Only teachers teaching the course and admins can create resources.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiBody({
    type: CreateResourceDto,
    description: 'Resource creation details and file upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource created successfully',
    type: ResourceListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or missing file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can create resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async createCourseResource(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResourceListResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot create resources');
    }

    return this.courseManagementService.createCourseResource(
      courseId,
      createResourceDto,
      file,
      req.user.id,
      req.user.role_id,
    );
  }

  @Post(':courseId/sections/:sectionId/resources')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new resource',
    description:
      'Upload and attach a resource to a section. Only teachers teaching the course and admins can create resources.',
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
  @ApiBody({
    type: CreateResourceDto,
    description: 'Resource creation details and file upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource created successfully',
    type: ResourceListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or missing file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can create resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async createResource(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResourceListResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot create resources');
    }

    return this.courseManagementService.createResource(
      sectionId,
      createResourceDto,
      file,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/sections/:sectionId/resources')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all resources for a section',
    description:
      'Get all resources for a section with optional filters. Only teachers teaching the course and admins can access.',
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
  @ApiQuery({
    name: 'resourceType',
    required: false,
    type: String,
    description: 'Filter by resource type',
    example: 'video',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'isPreview',
    required: false,
    type: Boolean,
    description: 'Filter by preview status',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: [ResourceListResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can view resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async getResourcesBySection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Query('resourceType') resourceType?: string,
    @Query('isActive') isActive?: string,
    @Query('isPreview') isPreview?: string,
  ): Promise<ResourceListResponseDto[]> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view resources');
    }

    const filters: {
      resourceType?: string;
      isActive?: boolean;
      isPreview?: boolean;
    } = {};

    if (resourceType) {
      filters.resourceType = resourceType;
    }
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (isPreview !== undefined) {
      filters.isPreview = isPreview === 'true';
    }

    return this.courseManagementService.getResourcesBySection(
      sectionId,
      courseId,
      filters,
      req.user.id,
      req.user.role_id,
    );
  }

  @Get(':courseId/sections/:sectionId/resources/:resourceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific resource',
    description:
      'Get a specific resource by ID. Only teachers teaching the course and admins can access.',
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
  @ApiParam({
    name: 'resourceId',
    type: Number,
    description: 'Resource ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
    type: ResourceListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can view resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Resource not found',
  })
  async getResourceById(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ): Promise<ResourceListResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot view resources');
    }

    return this.courseManagementService.getResourceById(
      resourceId,
      courseId,
      sectionId,
      req.user.id,
      req.user.role_id,
    );
  }

  @Patch(':courseId/sections/:sectionId/resources/:resourceId')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a resource',
    description:
      'Update resource metadata or replace the file. Only teachers teaching the course and admins can update resources.',
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
  @ApiParam({
    name: 'resourceId',
    type: Number,
    description: 'Resource ID to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateResourceDto,
    description: 'Resource update details (all fields optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    type: ResourceListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can update resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Resource not found',
  })
  async updateResource(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Body() updateResourceDto: UpdateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResourceListResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot update resources');
    }

    return this.courseManagementService.updateResource(
      resourceId,
      updateResourceDto,
      file,
      req.user.id,
      req.user.role_id,
    );
  }

  @Delete(':courseId/sections/:sectionId/resources/:resourceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a resource',
    description:
      'Delete a resource and its associated file from Cloudinary. Only teachers teaching the course and admins can delete resources.',
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
  @ApiParam({
    name: 'resourceId',
    type: Number,
    description: 'Resource ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
    schema: {
      example: { message: 'Resource deleted successfully' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers and admins can delete resources',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Resource not found',
  })
  async deleteResource(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ): Promise<{ message: string }> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot delete resources');
    }

    return this.courseManagementService.deleteResource(
      resourceId,
      req.user.id,
      req.user.role_id,
    );
  }
}

