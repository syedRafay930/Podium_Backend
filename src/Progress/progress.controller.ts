import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { ProgressService } from './progress.service';
import { CourseMarksheetResponseDto } from './dto/course-marksheet-response.dto';

@ApiTags('Progress')
@Controller('progress')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('courses/:courseId/marksheet')
  @ApiOperation({
    summary: 'Get student marksheet for a course',
    description:
      'Student-only marksheet for one enrolled course: all assignments and quizzes with submission/attempt status, marks, comments, and summary totals.',
  })
  @ApiParam({ name: 'courseId', type: Number, example: 2 })
  @ApiResponse({
    status: 200,
    description: 'Course marksheet retrieved successfully',
    type: CourseMarksheetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not enrolled / not a student' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseMarksheet(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    if (req.user.role_id !== 3) {
      throw new UnauthorizedException('Only students can view their marksheet');
    }

    return this.progressService.getCourseMarksheet(req.user.id, courseId);
  }
}
