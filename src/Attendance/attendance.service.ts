import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Attendance } from 'src/Entities/entities/Attendance';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { Enrollment } from 'src/Entities/entities/Enrollment';
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

    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,

    @InjectRepository(Lectures)
    private readonly lectureRepo: Repository<Lectures>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}

  /* =====================================================
     STUDENT: MY ATTENDANCE (FILTER BY COURSE / LECTURE)
     ===================================================== */

  async getMyAttendance(
    studentId: number,
    courseId?: number,
    lectureId?: number,
  ) {
    if (courseId) {
      const enrollment = await this.enrollmentRepo.findOne({
        where: {
          studentId,
          courseId,
          status: 'enrolled',
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'You are not enrolled in this course',
        );
      }
    }

    if (lectureId && courseId) {
      const lecture = await this.lectureRepo.findOne({
        where: { id: lectureId },
        relations: ['course'],
      });

      if (!lecture || lecture.isDelete) {
        throw new NotFoundException('Lecture not found');
      }

      if (lecture.course?.id !== courseId) {
        throw new NotFoundException(
          'Lecture does not belong to the selected course',
        );
      }
    }

    const qb = this.attendanceDetailsRepo
      .createQueryBuilder('details')
      .innerJoinAndSelect('details.attendance', 'attendance')
      .innerJoinAndSelect('attendance.lecture', 'lecture')
      .innerJoinAndSelect('lecture.course', 'course')
      .where('details.student_id = :studentId', { studentId })
      .andWhere('lecture.isDelete = false')
      .orderBy('attendance.attendanceDate', 'DESC')
      .addOrderBy('lecture.lectureOrder', 'ASC');

    if (courseId) {
      qb.andWhere('course.id = :courseId', { courseId });
    }

    if (lectureId) {
      qb.andWhere('lecture.id = :lectureId', { lectureId });
    }

    const details = await qb.getMany();

    const data = details.map((detail) => ({
      attendanceId: detail.attendance.id,
      attendanceDate: detail.attendance.attendanceDate,
      status: detail.status,
      lecture: {
        id: detail.attendance.lecture.id,
        title: detail.attendance.lecture.title,
        lectureType: detail.attendance.lecture.lectureType,
        lectureOrder: detail.attendance.lecture.lectureOrder ?? null,
      },
      course: {
        id: detail.attendance.lecture.course.id,
        courseName: detail.attendance.lecture.course.courseName,
      },
    }));

    const summary = {
      present: data.filter((item) => item.status === 'present').length,
      absent: data.filter((item) => item.status === 'absent').length,
      pending: data.filter(
        (item) => item.status !== 'present' && item.status !== 'absent',
      ).length,
      total: data.length,
    };

    return { data, summary };
  }

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
