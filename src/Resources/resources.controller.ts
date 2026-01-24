import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { ResourcesService } from './resources.service';
import { ResourceListResponseDto } from './dto/resource-list-response.dto';
import { ResourceDetailResponseDto } from './dto/resource-detail-response.dto';
import { CourseResourcesResponseDto } from './dto/course-resources-response.dto';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('my-courses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all resources for enrolled courses',
    description:
      'Get all resources for all courses the student is enrolled in. Returns resources grouped by course. Only active resources are returned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: [CourseResourcesResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only students can access this endpoint',
  })
  async getResourcesForEnrolledCourses(
    @Request() req,
  ): Promise<CourseResourcesResponseDto[]> {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException('Only students can access this endpoint');
    }

    return this.resourcesService.getResourcesForEnrolledCourses(req.user.id);
  }

  @Get('courses/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all resources for a specific enrolled course',
    description:
      'Get all resources for a specific course the student is enrolled in. Includes resources attached directly to the course and all section/subsection resources.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    type: String,
    description: 'Filter by resource type (e.g., pdf, document, video)',
    example: 'pdf',
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
    description: 'Forbidden - Student is not enrolled in this course',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async getResourcesByCourse(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('resourceType') resourceType?: string,
    @Query('isPreview') isPreview?: string,
  ): Promise<ResourceListResponseDto[]> {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException('Only students can access this endpoint');
    }

    const filters: {
      resourceType?: string;
      isPreview?: boolean;
    } = {};

    if (resourceType) {
      filters.resourceType = resourceType;
    }

    if (isPreview !== undefined) {
      filters.isPreview = isPreview === 'true';
    }

    return this.resourcesService.getResourcesByCourse(
      courseId,
      req.user.id,
      filters,
    );
  }

  @Get('sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get resources for a specific section/subsection',
    description:
      'Get all resources for a specific section or subsection. Validates that the student is enrolled in the parent course.',
  })
  @ApiParam({
    name: 'sectionId',
    type: Number,
    description: 'Section ID',
    example: 1,
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
    description: 'Forbidden - Student is not enrolled in the parent course',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Section not found',
  })
  async getResourcesBySection(
    @Request() req,
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ): Promise<ResourceListResponseDto[]> {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException('Only students can access this endpoint');
    }

    return this.resourcesService.getResourcesBySection(sectionId, req.user.id);
  }

  @Get(':resourceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific resource by ID',
    description:
      'Get detailed information about a specific resource. Returns file URL and metadata. Frontend can handle download/preview directly from the fileUrl.',
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
    type: ResourceDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Student is not enrolled in the parent course or resource is inactive',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Resource not found',
  })
  async getResourceById(
    @Request() req,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ): Promise<ResourceDetailResponseDto> {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException('Only students can access this endpoint');
    }

    return this.resourcesService.getResourceById(resourceId, req.user.id);
  }
}

