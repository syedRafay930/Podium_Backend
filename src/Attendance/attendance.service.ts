import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Attendance } from 'src/Entities/entities/Attendance';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Users } from 'src/Entities/entities/Users';

import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,

    @InjectRepository(AttendanceDetails)
    private readonly attendanceDetailsRepo: Repository<AttendanceDetails>,

    @InjectRepository(Lectures)
    private readonly lectureRepo: Repository<Lectures>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}


  /* =====================================================
     GET ALL ATTENDANCE (PAGINATED)
     ===================================================== */

  async getAllAttendance(
    page: number,
    limit: number,
    user: any,
    lectureId?: number,
    date?: string,
  ) {
    const qb = this.attendanceRepo
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.lecture', 'lecture')
      .leftJoinAndSelect('attendance.teacher', 'teacher')
      .leftJoinAndSelect('attendance.attendanceDetails', 'details')
      .leftJoinAndSelect('details.student', 'student')
      .orderBy('attendance.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Teacher sees only own attendance
    if (user.role_id === 2) {
      qb.andWhere('teacher.id = :teacherId', {
        teacherId: user.id,
      });
    }

    if (lectureId) {
      qb.andWhere('lecture.id = :lectureId', { lectureId });
    }

    if (date) {
      qb.andWhere('attendance.attendanceDate = :date', { date });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* =====================================================
     GET ATTENDANCE BY ID
     ===================================================== */

  async getAttendanceById(
    attendanceId: number,
    userId: number,
    roleId: number,
  ) {
    const attendance = await this.attendanceRepo.findOne({
      where: { id: attendanceId },
      relations: [
        'lecture',
        'teacher',
        'attendanceDetails',
        'attendanceDetails.student',
      ],
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    // Teacher access check
    if (roleId === 2 && attendance.teacher.id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to view this attendance',
      );
    }

    return attendance;
  }

  /* =====================================================
     UPDATE ATTENDANCE
     ===================================================== */

  async updateAttendance(
    attendanceId: number,
    dto: UpdateAttendanceDto,
    updatedById: number,
  ) {
    const attendance = await this.attendanceRepo.findOne({
      where: { id: attendanceId },
      relations: ['teacher', 'attendanceDetails', 'attendanceDetails.student'],
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    if (attendance.teacher.id !== updatedById) {
      throw new ForbiddenException(
        'You are not allowed to update this attendance',
      );
    }

    if (dto.attendanceDate) {
      attendance.attendanceDate = dto.attendanceDate;
    }

    attendance.updatedAt = new Date();
    attendance.updatedBy = { id: updatedById } as Users;

    await this.attendanceRepo.save(attendance);

    if (dto.presentStudentIds?.length || dto.absentStudentIds?.length) {
      const details =
        attendance.attendanceDetails ||
        (await this.attendanceDetailsRepo.find({
          where: { attendance: { id: attendanceId } },
          relations: ['student'],
        }));

      const detailByStudentId = new Map<number, AttendanceDetails>();
      for (const detail of details) {
        if (detail.student?.id) {
          detailByStudentId.set(detail.student.id, detail);
        }
      }

      const updates: AttendanceDetails[] = [];

      for (const studentId of dto.presentStudentIds || []) {
        const detail = detailByStudentId.get(studentId);
        if (detail) {
          detail.status = 'present';
          updates.push(detail);
        }
      }

      for (const studentId of dto.absentStudentIds || []) {
        const detail = detailByStudentId.get(studentId);
        if (detail) {
          detail.status = 'absent';
          updates.push(detail);
        }
      }

      if (updates.length) {
        await this.attendanceDetailsRepo.save(updates);
      }
    }

    return this.getAttendanceById(attendanceId, updatedById, 2);
  }
}
