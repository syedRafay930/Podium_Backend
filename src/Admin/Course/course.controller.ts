import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { AddCourseDto } from './dto/add_course.dto';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('create')
  async createCourse(@Request() req, @Body() courseDto: AddCourseDto) {
    return this.courseService.createCourse(courseDto, req.user.admin_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @Get('all')
  async getAllCourses(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.courseService.getAllCourses(
      +page,
      +limit,
      category,
      search,
    );
  }
}
