import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { LecturesService } from './lectures.service';
import { CreateRecordedLectureDto } from './dto/create-recorded-lecture.dto';
import { CreateLiveLectureDto } from './dto/create-live-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { LectureResponseDto, LectureListResponseDto } from './dto/lecture-response.dto';

@ApiTags('Lectures')
@Controller('lectures')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class LecturesController {
  constructor(private readonly lecturesService: LecturesService) {}

  /**
   * Create recorded lecture with video upload
   */
  @Post('recorded')
  @UseInterceptors(FileInterceptor('video'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Recorded Lecture',
    description:
      'Teacher only - Create a recorded lecture with video file upload to Cloudinary. Video file is optional.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Introduction to Databases',
          description: 'Lecture title',
        },
        description: {
          type: 'string',
          example: 'Learn database basics',
          description: 'Optional lecture description',
        },
        courseId: {
          type: 'number',
          example: 1,
          description: 'Course ID',
        },
        sectionId: {
          type: 'number',
          example: 1,
          description: 'Section ID',
        },
        lectureOrder: {
          type: 'number',
          example: 1,
          description: 'Optional lecture order in section',
        },
        duration: {
          type: 'number',
          example: 3600,
          description: 'Optional duration in seconds',
        },
        video: {
          type: 'string',
          format: 'binary',
          description: 'Optional video file (MP4, WebM, etc.)',
        },
      },
      required: ['title', 'courseId', 'sectionId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Recorded lecture created successfully',
    type: LectureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or video upload failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can create lectures',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course or section not found',
  })
  async createRecordedLecture(
    @Request() req,
    @Body() createRecordedLectureDto: CreateRecordedLectureDto,
    @UploadedFile() video?: Express.Multer.File,
  ): Promise<LectureResponseDto> {
    return this.lecturesService.createRecordedLecture(
      createRecordedLectureDto,
      req.user.id,
      req.user.role_id,
      video,
    );
  }

  /**
   * Create live lecture with Google Meet
   */
  @Post('live')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Live Lecture',
    description:
      'Teacher only - Create a live lecture with Google Meet integration. Requires Google Calendar connection.',
  })
  @ApiBody({
    type: CreateLiveLectureDto,
    description: 'Live lecture creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Live lecture created successfully with Google Meet link',
    type: LectureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid input or Google Calendar not connected',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can create lectures',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course or section not found',
  })
  async createLiveLecture(
    @Request() req,
    @Body() createLiveLectureDto: CreateLiveLectureDto,
  ): Promise<LectureResponseDto> {
    return this.lecturesService.createLiveLecture(
      createLiveLectureDto,
      req.user.id,
      req.user.role_id,
    );
  }

  /**
   * Get lectures by section
   */
  @Get('course/:courseId/section/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Lectures by Section',
    description:
      'Get all lectures in a specific section. Teachers can access only their courses. Admins can access all courses.',
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
    description: 'Lectures retrieved successfully',
    type: LectureListResponseDto,
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
    description: 'Not found - Course or section not found',
  })
  async getLecturesBySection(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ): Promise<LectureListResponseDto> {
    const lectures = await this.lecturesService.getLecturesBySection(
      courseId,
      sectionId,
      req.user.id,
      req.user.role_id,
    );

    return {
      lectures,
      total: lectures.length,
      courseId,
      sectionId,
    };
  }

  /**
   * Get lecture by ID
   */
  @Get(':lectureId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Lecture by ID',
    description: 'Get a specific lecture details',
  })
  @ApiParam({
    name: 'lectureId',
    type: Number,
    description: 'Lecture ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lecture retrieved successfully',
    type: LectureResponseDto,
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
    description: 'Not found - Lecture not found',
  })
  async getLectureById(
    @Request() req,
    @Param('lectureId', ParseIntPipe) lectureId: number,
  ): Promise<LectureResponseDto> {
    return this.lecturesService.getLectureById(
      lectureId,
      req.user.id,
      req.user.role_id,
    );
  }

  /**
   * Update lecture
   */
  @Patch(':lectureId/course/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Lecture',
    description:
      'Teacher only - Update lecture details. Video URL cannot be changed after creation.',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiParam({
    name: 'lectureId',
    type: Number,
    description: 'Lecture ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateLectureDto,
    description: 'Lecture update details (all fields optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lecture updated successfully',
    type: LectureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can update lectures',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Lecture not found',
  })
  async updateLecture(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lectureId', ParseIntPipe) lectureId: number,
    @Body() updateLectureDto: UpdateLectureDto,
  ): Promise<LectureResponseDto> {
    return this.lecturesService.updateLecture(
      lectureId,
      courseId,
      updateLectureDto,
      req.user.id,
      req.user.role_id,
    );
  }

  /**
   * Delete lecture
   */
  @Delete(':lectureId/course/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete Lecture',
    description: 'Teacher only - Soft delete a lecture',
  })
  @ApiParam({
    name: 'courseId',
    type: Number,
    description: 'Course ID',
    example: 1,
  })
  @ApiParam({
    name: 'lectureId',
    type: Number,
    description: 'Lecture ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lecture deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can delete lectures',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Lecture not found',
  })
  async deleteLecture(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lectureId', ParseIntPipe) lectureId: number,
  ): Promise<{ message: string }> {
    return this.lecturesService.deleteLecture(
      lectureId,
      courseId,
      req.user.id,
      req.user.role_id,
    );
  }

  /**
   * Reorder lectures within section
   */
  @Patch('reorder/course/:courseId/section/:sectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder Lectures',
    description: 'Teacher only - Reorder lectures within a section',
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
    schema: {
      type: 'object',
      properties: {
        lectures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lectureId: { type: 'number', example: 1 },
              order: { type: 'number', example: 1 },
            },
            required: ['lectureId', 'order'],
          },
          description: 'Array of lecture IDs with new order',
        },
      },
      required: ['lectures'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lectures reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can reorder lectures',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course, section, or lecture not found',
  })
  async reorderLectures(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() body: { lectures: { lectureId: number; order: number }[] },
  ): Promise<{ message: string }> {
    return this.lecturesService.reorderLectures(
      courseId,
      sectionId,
      body.lectures,
      req.user.id,
      req.user.role_id,
    );
  }
}
