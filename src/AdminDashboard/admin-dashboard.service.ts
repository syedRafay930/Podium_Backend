import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/Entities/entities/Users';
import { Courses } from 'src/Entities/entities/Courses';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Transactions } from 'src/Entities/entities/Transactions';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Attendance } from 'src/Entities/entities/Attendance';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Courses)
    private readonly coursesRepository: Repository<Courses>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Transactions)
    private readonly transactionsRepository: Repository<Transactions>,
    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async getDashboard(adminId: number) {
    const admin = await this.usersRepository.findOne({
      where: { id: adminId, isDelete: false },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      studentsTotal,
      studentsActive,
      studentsNewThisMonth,
      teachersTotal,
      teachersActive,
      teachersNewThisMonth,
      coursesTotal,
      coursesActive,
      coursesWithTeacher,
      coursesWithoutTeacher,
      enrollmentsTotal,
      enrollmentsPending,
      enrollmentsEnrolled,
      enrollmentsRejected,
      enrollmentsDismissed,
      teacherPending,
      teacherAccepted,
      teacherRejected,
      teacherUnassigned,
      revenueAgg,
      revenueThisMonthAgg,
      pendingSubmissionsToGrade,
      unmarkedAttendanceSessions,
      pendingEnrollmentRows,
      pendingTeacherRows,
      pendingPaymentRows,
      recentEnrollmentRows,
      recentCourseRows,
      recentStudentRows,
      monthlyRevenueRows,
    ] = await Promise.all([
      this.countUsersByRole(3),
      this.countUsersByRole(3, true),
      this.countUsersByRoleSince(3, monthStart),
      this.countUsersByRole(2),
      this.countUsersByRole(2, true),
      this.countUsersByRoleSince(2, monthStart),
      this.coursesRepository.count(),
      this.coursesRepository.count({ where: { isActive: true } }),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NOT NULL')
        .getCount(),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NULL')
        .getCount(),
      this.enrollmentRepository.count(),
      this.enrollmentRepository.count({ where: { status: 'pending' } }),
      this.enrollmentRepository.count({ where: { status: 'enrolled' } }),
      this.enrollmentRepository.count({ where: { status: 'rejected' } }),
      this.enrollmentRepository.count({ where: { status: 'dismissed' } }),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NOT NULL')
        .andWhere('course.teacherStatus = :status', { status: 'pending' })
        .getCount(),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NOT NULL')
        .andWhere('course.teacherStatus = :status', { status: 'accepted' })
        .getCount(),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NOT NULL')
        .andWhere('course.teacherStatus = :status', { status: 'rejected' })
        .getCount(),
      this.coursesRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NULL')
        .getCount(),
      this.transactionsRepository
        .createQueryBuilder('txn')
        .select(
          `COALESCE(SUM(CASE WHEN txn.status = 'paid' THEN txn.amount ELSE 0 END), 0)`,
          'totalRevenue',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN txn.status = 'pending' THEN txn.amount ELSE 0 END), 0)`,
          'pendingAmount',
        )
        .addSelect(
          `SUM(CASE WHEN txn.status = 'paid' THEN 1 ELSE 0 END)`,
          'paidCount',
        )
        .addSelect(
          `SUM(CASE WHEN txn.status = 'pending' THEN 1 ELSE 0 END)`,
          'pendingCount',
        )
        .addSelect(
          `SUM(CASE WHEN txn.status = 'failed' THEN 1 ELSE 0 END)`,
          'failedCount',
        )
        .addSelect(
          `SUM(CASE WHEN txn.status = 'free' THEN 1 ELSE 0 END)`,
          'freeCount',
        )
        .getRawOne(),
      this.transactionsRepository
        .createQueryBuilder('txn')
        .select(`COALESCE(SUM(txn.amount), 0)`, 'amount')
        .where('txn.status = :status', { status: 'paid' })
        .andWhere('txn.createdAt >= :monthStart', { monthStart })
        .getRawOne(),
      this.submissionRepository
        .createQueryBuilder('submission')
        .where('submission.status IN (:...statuses)', {
          statuses: ['submitted', 'late'],
        })
        .getCount(),
      this.attendanceRepository.count({ where: { isMarked: false } }),
      this.enrollmentRepository.find({
        where: { status: 'pending' },
        relations: ['student', 'course', 'transactions'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.coursesRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.teacher', 'teacher')
        .where('course.teacher_id IS NOT NULL')
        .andWhere('course.teacherStatus = :status', { status: 'pending' })
        .orderBy('course.updatedAt', 'DESC')
        .addOrderBy('course.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.transactionsRepository.find({
        where: { status: 'pending' },
        relations: ['enroll', 'enroll.student', 'enroll.course'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.enrollmentRepository.find({
        relations: ['student', 'course'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.coursesRepository.find({
        relations: ['teacher'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.usersRepository.find({
        where: { role: { id: 3 }, isDelete: false },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.transactionsRepository
        .createQueryBuilder('txn')
        .select(`TO_CHAR(DATE_TRUNC('month', txn.createdAt), 'YYYY-MM')`, 'month')
        .addSelect(`COALESCE(SUM(txn.amount), 0)`, 'amount')
        .where('txn.status = :status', { status: 'paid' })
        .andWhere('txn.createdAt >= :sixMonthsAgo', { sixMonthsAgo })
        .groupBy(`DATE_TRUNC('month', txn.createdAt)`)
        .orderBy(`DATE_TRUNC('month', txn.createdAt)`, 'ASC')
        .getRawMany(),
    ]);

    const revenueLast6Months = this.fillLast6Months(
      monthlyRevenueRows.map((row) => ({
        month: row.month,
        amount: Number(row.amount ?? 0).toFixed(2),
      })),
      now,
    );

    return {
      welcome: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      },
      metrics: {
        students: {
          total: studentsTotal,
          active: studentsActive,
          newThisMonth: studentsNewThisMonth,
        },
        teachers: {
          total: teachersTotal,
          active: teachersActive,
          newThisMonth: teachersNewThisMonth,
        },
        courses: {
          total: coursesTotal,
          active: coursesActive,
          withTeacher: coursesWithTeacher,
          withoutTeacher: coursesWithoutTeacher,
        },
        enrollments: {
          total: enrollmentsTotal,
          pending: enrollmentsPending,
          enrolled: enrollmentsEnrolled,
          rejected: enrollmentsRejected,
          dismissed: enrollmentsDismissed,
        },
        teacherAssignments: {
          pending: teacherPending,
          accepted: teacherAccepted,
          rejected: teacherRejected,
          unassigned: teacherUnassigned,
        },
        revenue: {
          totalRevenue: Number(revenueAgg?.totalRevenue ?? 0).toFixed(2),
          pendingAmount: Number(revenueAgg?.pendingAmount ?? 0).toFixed(2),
          revenueThisMonth: Number(revenueThisMonthAgg?.amount ?? 0).toFixed(2),
          paidCount: Number(revenueAgg?.paidCount ?? 0),
          pendingCount: Number(revenueAgg?.pendingCount ?? 0),
          failedCount: Number(revenueAgg?.failedCount ?? 0),
          freeCount: Number(revenueAgg?.freeCount ?? 0),
        },
        workload: {
          pendingSubmissionsToGrade,
          unmarkedAttendanceSessions,
        },
      },
      actionRequired: {
        pendingEnrollments: pendingEnrollmentRows.map((e) => ({
          id: e.id,
          studentName: e.student
            ? `${e.student.firstName} ${e.student.lastName}`.trim()
            : 'N/A',
          studentId: e.student?.id ?? 0,
          courseName: e.course?.courseName ?? 'N/A',
          courseId: e.course?.id ?? 0,
          amount: e.transactions?.amount ?? null,
          screenshotUrl: e.transactions?.screenshotUrl ?? null,
          createdAt: e.createdAt,
        })),
        pendingTeacherAssignments: pendingTeacherRows.map((c) => ({
          courseId: c.id,
          courseName: c.courseName,
          teacherName: c.teacher
            ? `${c.teacher.firstName} ${c.teacher.lastName}`.trim()
            : null,
          teacherId: c.teacher?.id ?? null,
          assignmentStatus: c.teacherStatus,
          updatedAt: c.updatedAt,
        })),
        pendingPayments: pendingPaymentRows.map((t) => ({
          uuid: t.uuid,
          studentName: t.enroll?.student
            ? `${t.enroll.student.firstName} ${t.enroll.student.lastName}`.trim()
            : 'N/A',
          courseName: t.enroll?.course?.courseName ?? 'N/A',
          amount: t.amount,
          screenshotUrl: t.screenshotUrl,
          createdAt: t.createdAt,
        })),
      },
      recentActivity: {
        recentEnrollments: recentEnrollmentRows.map((e) => ({
          id: e.id,
          status: e.status,
          studentName: e.student
            ? `${e.student.firstName} ${e.student.lastName}`.trim()
            : 'N/A',
          courseName: e.course?.courseName ?? 'N/A',
          createdAt: e.createdAt,
        })),
        recentCourses: recentCourseRows.map((c) => ({
          id: c.id,
          courseName: c.courseName,
          coverImg: c.coverImg,
          teacherStatus: c.teacherStatus,
          teacherName: c.teacher
            ? `${c.teacher.firstName} ${c.teacher.lastName}`.trim()
            : null,
          createdAt: c.createdAt,
        })),
        recentStudents: recentStudentRows.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          createdAt: s.createdAt,
        })),
      },
      charts: {
        enrollmentsByStatus: [
          { label: 'pending', value: enrollmentsPending },
          { label: 'enrolled', value: enrollmentsEnrolled },
          { label: 'rejected', value: enrollmentsRejected },
          { label: 'dismissed', value: enrollmentsDismissed },
        ],
        coursesByAssignmentStatus: [
          { label: 'pending', value: teacherPending },
          { label: 'accepted', value: teacherAccepted },
          { label: 'rejected', value: teacherRejected },
          { label: 'unassigned', value: teacherUnassigned },
        ],
        revenueLast6Months,
      },
    };
  }

  private countUsersByRole(roleId: number, activeOnly?: boolean) {
    const where: any = { role: { id: roleId }, isDelete: false };
    if (activeOnly) where.isActive = true;
    return this.usersRepository.count({ where });
  }

  private countUsersByRoleSince(roleId: number, since: Date) {
    return this.usersRepository
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.id = :roleId', { roleId })
      .andWhere('user.isDelete = false')
      .andWhere('user.createdAt >= :since', { since })
      .getCount();
  }

  private fillLast6Months(
    rows: { month: string; amount: string }[],
    now: Date,
  ) {
    const map = new Map(rows.map((r) => [r.month, r.amount]));
    const result: { month: string; amount: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ month: key, amount: map.get(key) ?? '0.00' });
    }

    return result;
  }
}
