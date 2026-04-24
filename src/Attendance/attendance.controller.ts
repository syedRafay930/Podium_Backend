import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { AttendanceService } from './attendance.service';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceResponseDto } from 'src/common/dto/responses/attendance-response.dto';
import { PaginatedAttendanceResponseDto } from 'src/common/dto/responses/paginated-attendance-response.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  /* ===================== CREATE ATTENDANCE ===================== */

    // @UseGuards(JwtBlacklistGuard)
    // @Post('create')
    // @HttpCode(HttpStatus.CREATED)
    // @ApiBearerAuth('JWT-auth')
    // @ApiOperation({
    // summary: 'Create attendance',
    // description: 'Teacher creates attendance for a lecture on a specific date.',
    // })
    // @ApiBody({
    // type: CreateAttendanceDto,
    // description: 'Lecture ID, attendance date, and attendance details',
    // })
    // @ApiResponse({
    // status: 201,
    // description: 'Attendance created successfully',
    // type: AttendanceResponseDto,
    // })
    // @ApiResponse({ status: 401, description: 'Unauthorized' })
    // @ApiResponse({ status: 403, description: 'Only teachers can create attendance' })
    // @ApiResponse({ status: 404, description: 'Lecture not found' })
    // async createAttendance(
    // @Request() req,
    // @Body() dto: CreateAttendanceDto,
    // ) {
    // if (req.user.role_id !== 2) {
    //     throw new UnauthorizedException('Only teachers can mark attendance');
    // }

    // return this.attendanceService.createAttendance(dto, req.user.id);
    // }

  /* ===================== GET ALL ATTENDANCE ===================== */

  @UseGuards(JwtBlacklistGuard)
  @Get('all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all attendance records',
    description: 'Get paginated attendance list. Admin sees all, teacher sees own.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'lectureId',
    required: false,
    type: Number,
    description: 'Filter by lecture ID',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by attendance date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated attendance list',
    type: PaginatedAttendanceResponseDto,
  })
  async getAllAttendance(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('lectureId') lectureId?: number,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getAllAttendance(
      +page,
      +limit,
      req.user,
      lectureId,
      date,
    );
  }

  /* ===================== GET ATTENDANCE BY ID ===================== */

  @UseGuards(JwtBlacklistGuard)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get attendance by ID',
    description: 'Get attendance record with lecture, teacher, and details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Attendance ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance retrieved successfully',
    type: AttendanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async getAttendanceById(
    @Request() req,
    @Param('id') attendanceId: number,
  ) {
    return this.attendanceService.getAttendanceById(
      attendanceId,
      req.user.id,
      req.user.role_id,
    );
  }

  /* ===================== UPDATE ATTENDANCE ===================== */

  @UseGuards(JwtBlacklistGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update attendance',
    description: 'Teacher updates attendance (students present/absent).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Attendance ID',
  })
  @ApiBody({
    type: UpdateAttendanceDto,
    description: 'Updated attendance details',
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance updated successfully',
    type: AttendanceResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Only teacher can update attendance' })
  async updateAttendance(
    @Request() req,
    @Param('id') attendanceId: number,
    @Body() dto: UpdateAttendanceDto,
  ) {
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException('Only teachers can update attendance');
    }

    return this.attendanceService.updateAttendance(
      attendanceId,
      dto,
      req.user.id,
    );
  }
}
