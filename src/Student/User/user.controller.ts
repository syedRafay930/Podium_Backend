import {
  Get,
  Controller,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { StdJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { CourseService } from 'src/Admin/Course/course.service';

@Controller()
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly courseService: CourseService,
  ) {}

  @UseGuards(StdJwtBlacklistGuard)
  @Get('all-courses')
  async getAllCourses(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.courseService.getAllCourses(+page, +limit, category, search);
  }

  @UseGuards(StdJwtBlacklistGuard)
  @Get('course/:id')
  async getCourseById(@Param('id') courseId: number) {
    return this.courseService.getCourseById(courseId);
  }
  
}
