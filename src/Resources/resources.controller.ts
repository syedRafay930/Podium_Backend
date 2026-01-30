import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  Post,
  UploadedFile,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UnauthorizedException,
  Patch,
  Delete,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { ApiBody } from '@nestjs/swagger';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceListResponseDto } from './dto/resource-list-response.dto';
import { ResourceDetailResponseDto } from './dto/resource-detail-response.dto';
import { CourseResourcesResponseDto } from './dto/course-resources-response.dto';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

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

    return this.resourcesService.createCourseResource(
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
    summary: 'Create a new resource by section',
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
  async createResourceBySection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResourceListResponseDto> {
    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Students cannot create resources');
    }

    return this.resourcesService.createResourceBySection(
      courseId,
      sectionId,
      createResourceDto,
      file,
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

    return this.resourcesService.getResourceById(
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

    return this.resourcesService.updateResource(
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

    return this.resourcesService.deleteResource(
      resourceId,
      req.user.id,
      req.user.role_id,
    );
  }
}
