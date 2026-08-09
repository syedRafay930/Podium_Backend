import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Transactions } from 'src/Entities/entities/Transactions';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Assignment } from 'src/Entities/entities/Assignment';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { Resources } from 'src/Entities/entities/Resources';
import { MailService } from 'src/Nodemailer/mailer.service';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { EnrollmentAction } from './dto/update-enrollment-status.dto';
import { S3Helper } from 'src/S3/s3.helper';
import { DataSource } from 'typeorm';
import { ProgressService } from 'src/Progress/progress.service';
import { AttendanceService } from 'src/Attendance/attendance.service';

type CourseUpdateType = 'lecture' | 'assignment' | 'quiz' | 'resource';

const REAPPLY_COOLDOWN_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
    @InjectRepository(Lectures)
    private readonly lectureRepository: Repository<Lectures>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Quizzes)
    private readonly quizRepository: Repository<Quizzes>,
    @InjectRepository(Resources)
    private readonly resourceRepository: Repository<Resources>,
    private readonly mailService: MailService,
    private readonly s3Helper: S3Helper,
    private readonly dataSource: DataSource,
    private readonly progressService: ProgressService,
    private readonly attendanceService: AttendanceService,
  ) {}

  private async handlePostStatusUpdateTasks(
    enrollment: Enrollment,
    action: EnrollmentAction,
  ) {
    // Keep payment screenshot on reject for admin review / audit history.
    // Re-request overwrites screenshotUrl with a new upload when applicable.

    const template =
      action === EnrollmentAction.APPROVE
        ? 'enrollment-approved'
        : 'enrollment-rejected';
    const subject =
      action === EnrollmentAction.APPROVE
        ? 'Enrollment Approved - Podium'
        : 'Enrollment Request Rejected - Podium';

    try {
      await this.mailService.sendTemplatedMail(
        enrollment.student.email,
        subject,
        template,
        {
          studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          courseName: enrollment.course.courseName,
          rejectionReason: enrollment.rejectionReason || 'No reason provided',
        },
      );
    } catch (error) {
      console.error(`Failed to send ${template} email:`, error);
    }
  }

  async myEnrolledCourses(studentId: number): Promise<any[]> {
    const enrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.courseCategory', 'courseCategory')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(courseRating.rating)', 'avgRating')
          .from(CourseRating, 'courseRating')
          .where('courseRating.course_id = course.id');
      }, 'course_avgRating')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.status = :status', { status: 'enrolled' })
      .orderBy('enrollment.createdAt', 'DESC')
      .getRawAndEntities();

    const courseIds = enrollments.entities
      .map((enrollment) => enrollment.course?.id)
      .filter((id): id is number => !!id);

    const progressByCourse =
      await this.progressService.getCoursesProgressBatch(studentId, courseIds);

    return enrollments.entities.map((enrollment, index) => {
      let teacherWithoutPassword: any = null;
      if (enrollment.course.teacher) {
        const { hashedPassword, ...rest } = enrollment.course.teacher;
        teacherWithoutPassword = rest;
      }
      const courseProgress = progressByCourse.get(enrollment.course.id);
      return {
        ...enrollment,
        course: {
          ...enrollment.course,
          teacher: teacherWithoutPassword,
          avgRating: enrollments.raw[index]?.course_avgRating || 0,
        },
        progress: courseProgress
          ? {
              lectures: courseProgress.lectures,
              assignments: courseProgress.assignments,
              quizzes: courseProgress.quizzes,
              overall: courseProgress.overall,
            }
          : {
              lectures: { total: 0, completed: 0 },
              assignments: { total: 0, completed: 0 },
              quizzes: { total: 0, completed: 0 },
              overall: { total: 0, completed: 0 },
            },
      };
    });
  }

  /* =====================================================
     STUDENT: MY ENROLLMENT REQUESTS (ALL STATUSES)
     ===================================================== */

  async myEnrollmentRequests(
    studentId: number,
    status?: 'pending' | 'enrolled' | 'rejected' | 'dismissed',
  ) {
    const qb = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.courseCategory', 'courseCategory')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('enrollment.transactions', 'transactions')
      .where('enrollment.studentId = :studentId', { studentId })
      .orderBy('enrollment.createdAt', 'DESC');

    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }

    const enrollments = await qb.getMany();

    const data = enrollments.map((enrollment) => {
      let teacher: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
      } | null = null;

      if (enrollment.course?.teacher) {
        teacher = {
          id: enrollment.course.teacher.id,
          firstName: enrollment.course.teacher.firstName,
          lastName: enrollment.course.teacher.lastName,
          email: enrollment.course.teacher.email,
        };
      }

      const txn = enrollment.transactions;

      const { canReapply, reapplyAvailableAt } =
        this.getReapplyAvailability(enrollment);

      return {
        id: enrollment.id,
        status: enrollment.status,
        isActive: enrollment.isActive,
        rejectionReason: enrollment.rejectionReason,
        rejectedAt: enrollment.rejectedAt,
        canReapply,
        reapplyAvailableAt,
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt,
        course: enrollment.course
          ? {
              id: enrollment.course.id,
              courseName: enrollment.course.courseName,
              price: enrollment.course.price,
              coverImg: enrollment.course.coverImg,
              shortDescription: enrollment.course.shortDescription,
              courseCategory: enrollment.course.courseCategory
                ? {
                    id: enrollment.course.courseCategory.id,
                    name: enrollment.course.courseCategory.name,
                  }
                : null,
              teacher,
            }
          : null,
        transaction: txn
          ? {
              id: txn.id,
              amount: txn.amount,
              status: txn.status,
              paymentType: txn.paymentType,
              screenshotUrl: txn.screenshotUrl,
              createdAt: txn.createdAt,
              updatedAt: txn.updatedAt,
            }
          : null,
      };
    });

    const summary = {
      pending: data.filter((item) => item.status === 'pending').length,
      enrolled: data.filter((item) => item.status === 'enrolled').length,
      rejected: data.filter((item) => item.status === 'rejected').length,
      dismissed: data.filter((item) => item.status === 'dismissed').length,
      total: data.length,
    };

    return { data, summary };
  }

  /* =====================================================
     STUDENT: MY COURSE MATERIAL UPDATES (RECENT FEED)
     ===================================================== */

  async myCourseUpdates(
    studentId: number,
    options?: {
      limit?: number;
      courseId?: number;
      types?: CourseUpdateType[];
    },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
    const allowedTypes: CourseUpdateType[] = [
      'lecture',
      'assignment',
      'quiz',
      'resource',
    ];
    const types =
      options?.types?.filter((type) => allowedTypes.includes(type)) ??
      allowedTypes;

    const enrollments = await this.enrollmentRepository.find({
      where: { studentId, status: 'enrolled' },
      select: ['courseId'],
    });

    let courseIds = enrollments.map((enrollment) => enrollment.courseId);

    if (options?.courseId) {
      if (!courseIds.includes(options.courseId)) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
      courseIds = [options.courseId];
    }

    if (!courseIds.length || !types.length) {
      return {
        data: [],
        meta: { returned: 0, limit },
      };
    }

    const fetchLimit = limit;
    const items: Array<{
      type: CourseUpdateType;
      id: number;
      title: string;
      occurredAt: Date | null;
      lectureType?: string | null;
      resourceType?: string | null;
      course: { id: number; courseName: string };
      section: { id: number; title: string } | null;
    }> = [];

    const mapSection = (section?: { id: number; title: string } | null) =>
      section ? { id: section.id, title: section.title } : null;

    const tasks: Promise<void>[] = [];

    if (types.includes('lecture')) {
      tasks.push(
        (async () => {
          const lectures = await this.lectureRepository
            .createQueryBuilder('lecture')
            .innerJoinAndSelect('lecture.course', 'course')
            .leftJoinAndSelect('lecture.section', 'section')
            .where('course.id IN (:...courseIds)', { courseIds })
            .andWhere('lecture.isDelete = false')
            .orderBy('lecture.createdAt', 'DESC')
            .take(fetchLimit)
            .getMany();

          for (const lecture of lectures) {
            items.push({
              type: 'lecture',
              id: lecture.id,
              title: lecture.title,
              occurredAt: lecture.createdAt,
              lectureType: lecture.lectureType,
              course: {
                id: lecture.course.id,
                courseName: lecture.course.courseName,
              },
              section: mapSection(lecture.section),
            });
          }
        })(),
      );
    }

    if (types.includes('assignment')) {
      tasks.push(
        (async () => {
          const assignments = await this.assignmentRepository
            .createQueryBuilder('assignment')
            .innerJoinAndSelect('assignment.course', 'course')
            .leftJoinAndSelect('assignment.section', 'section')
            .where('course.id IN (:...courseIds)', { courseIds })
            .orderBy('assignment.createdAt', 'DESC')
            .take(fetchLimit)
            .getMany();

          for (const assignment of assignments) {
            items.push({
              type: 'assignment',
              id: assignment.id,
              title: assignment.title,
              occurredAt: assignment.createdAt,
              course: {
                id: assignment.course.id,
                courseName: assignment.course.courseName,
              },
              section: mapSection(assignment.section),
            });
          }
        })(),
      );
    }

    if (types.includes('quiz')) {
      tasks.push(
        (async () => {
          const quizzes = await this.quizRepository
            .createQueryBuilder('quiz')
            .innerJoinAndSelect('quiz.course', 'course')
            .leftJoinAndSelect('quiz.section', 'section')
            .where('course.id IN (:...courseIds)', { courseIds })
            .andWhere('quiz.isDelete = false')
            .andWhere('quiz.isPublished = true')
            .orderBy('quiz.createdAt', 'DESC')
            .take(fetchLimit)
            .getMany();

          for (const quiz of quizzes) {
            items.push({
              type: 'quiz',
              id: quiz.id,
              title: quiz.title,
              occurredAt: quiz.createdAt,
              course: {
                id: quiz.course.id,
                courseName: quiz.course.courseName,
              },
              section: mapSection(quiz.section),
            });
          }
        })(),
      );
    }

    if (types.includes('resource')) {
      tasks.push(
        (async () => {
          const resources = await this.resourceRepository
            .createQueryBuilder('resource')
            .innerJoinAndSelect('resource.course', 'course')
            .leftJoinAndSelect('resource.section', 'section')
            .where('course.id IN (:...courseIds)', { courseIds })
            .andWhere('resource.isActive = true')
            .orderBy('resource.createdAt', 'DESC')
            .take(fetchLimit)
            .getMany();

          for (const resource of resources) {
            items.push({
              type: 'resource',
              id: resource.id,
              title: resource.title,
              occurredAt: resource.createdAt,
              resourceType: resource.resourceType,
              course: {
                id: resource.course.id,
                courseName: resource.course.courseName,
              },
              section: mapSection(resource.section),
            });
          }
        })(),
      );
    }

    await Promise.all(tasks);

    items.sort((a, b) => {
      const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return bTime - aTime;
    });

    const data = items.slice(0, limit);

    return {
      data,
      meta: {
        returned: data.length,
        limit,
      },
    };
  }

  /* =====================================================
     STUDENT: DASHBOARD HOME AGGREGATE
     ===================================================== */

  async myDashboard(studentId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: studentId },
    });

    if (!user || user.isDelete) {
      throw new NotFoundException('Student not found');
    }

    const [enrolledCourses, enrollmentRequests, recentUpdates, attendance] =
      await Promise.all([
        this.myEnrolledCourses(studentId),
        this.myEnrollmentRequests(studentId),
        this.myCourseUpdates(studentId, { limit: 5 }),
        this.attendanceService.getMyAttendance(studentId),
      ]);

    const progressPercents = enrolledCourses
      .map((enrollment) => {
        const total = enrollment.progress?.overall?.total ?? 0;
        const completed = enrollment.progress?.overall?.completed ?? 0;
        if (!total) return null;
        return (completed / total) * 100;
      })
      .filter((value): value is number => value !== null);

    const averageProgressPercent = progressPercents.length
      ? Math.round(
          (progressPercents.reduce((sum, value) => sum + value, 0) /
            progressPercents.length) *
            10,
        ) / 10
      : null;

    const attendanceSummary = attendance.summary;
    const marked =
      (attendanceSummary.present ?? 0) + (attendanceSummary.absent ?? 0);
    const attendanceRatePercent = marked
      ? Math.round(((attendanceSummary.present ?? 0) / marked) * 1000) / 10
      : null;

    const recentCourses = enrolledCourses.slice(0, 4).map((enrollment) => {
      const total = enrollment.progress?.overall?.total ?? 0;
      const completed = enrollment.progress?.overall?.completed ?? 0;
      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.course?.id,
        courseName: enrollment.course?.courseName,
        coverImg: enrollment.course?.coverImg ?? null,
        shortDescription: enrollment.course?.shortDescription ?? null,
        overall: { total, completed },
        progressPercent: total
          ? Math.round((completed / total) * 1000) / 10
          : null,
      };
    });

    const pendingEnrollments = enrollmentRequests.data
      .filter((item) => item.status === 'pending')
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        courseId: item.course?.id,
        courseName: item.course?.courseName,
        coverImg: item.course?.coverImg ?? null,
        createdAt: item.createdAt,
        paymentStatus: item.transaction?.status ?? null,
      }));

    const recentAttendance = (attendance.data ?? []).slice(0, 5).map((item) => ({
      attendanceId: item.attendanceId,
      attendanceDate: item.attendanceDate,
      status: item.status,
      lectureTitle: item.lecture?.title,
      courseName: item.course?.courseName,
      courseId: item.course?.id,
    }));

    return {
      welcome: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      metrics: {
        enrolledCoursesCount: enrolledCourses.length,
        pendingEnrollmentCount: enrollmentRequests.summary.pending,
        averageProgressPercent,
        attendance: {
          present: attendanceSummary.present,
          absent: attendanceSummary.absent,
          pending: attendanceSummary.pending,
          total: attendanceSummary.total,
          ratePercent: attendanceRatePercent,
        },
      },
      recentCourses,
      pendingEnrollments,
      recentUpdates: recentUpdates.data,
      recentAttendance,
    };
  }

  async getAllEnrollments(
    page: number = 1,
    limit: number = 10,
    status?: 'pending' | 'enrolled' | 'rejected' | 'dismissed',
    studentName?: string,
    courseName?: string,
    courseId?: number,
  ) {
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.enrolledBy', 'enrolledBy')
      .leftJoinAndSelect('enrollment.transactions', 'transactions')
      .orderBy('enrollment.createdAt', 'DESC');

    if (status) {
      query.andWhere('enrollment.status = :status', { status });
    }

    if (courseId) {
      query.andWhere('enrollment.courseId = :courseId', { courseId });
    }

    if (studentName) {
      query.andWhere(
        "CONCAT(student.firstName, ' ', student.lastName) ILIKE :studentName",
        { studentName: `%${studentName}%` },
      );
    }

    if (courseName) {
      query.andWhere('course.courseName ILIKE :courseName', {
        courseName: `%${courseName}%`,
      });
    }

    const total = await query.getCount();
    query.skip((page - 1) * limit).take(limit);
    const enrollments = await query.getMany();

    const [pending, enrolled, rejected, dismissed, totalAll] =
      await Promise.all([
        this.enrollmentRepository.count({ where: { status: 'pending' } }),
        this.enrollmentRepository.count({ where: { status: 'enrolled' } }),
        this.enrollmentRepository.count({ where: { status: 'rejected' } }),
        this.enrollmentRepository.count({ where: { status: 'dismissed' } }),
        this.enrollmentRepository.count(),
      ]);

    return {
      data: enrollments.map((enrollment) =>
        this.mapAdminEnrollmentItem(enrollment),
      ),
      meta: {
        totalItems: total,
        itemCount: enrollments.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit) || 0,
        currentPage: page,
      },
      stats: {
        total: totalAll,
        pending,
        enrolled,
        rejected,
        dismissed,
      },
    };
  }

  async studentsInCourse(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['student', 'enrolledBy', 'course', 'transactions'],
      order: { createdAt: 'DESC' },
    });

    const stats = {
      total: enrollments.length,
      pending: enrollments.filter((e) => e.status === 'pending').length,
      enrolled: enrollments.filter((e) => e.status === 'enrolled').length,
      rejected: enrollments.filter((e) => e.status === 'rejected').length,
      dismissed: enrollments.filter((e) => e.status === 'dismissed').length,
    };

    return {
      course: {
        id: course.id,
        courseName: course.courseName,
        price: course.price,
        coverImg: course.coverImg,
      },
      data: enrollments.map((enrollment) =>
        this.mapAdminEnrollmentItem(enrollment),
      ),
      stats,
    };
  }

  private mapAdminEnrollmentItem(enrollment: Enrollment) {
    const student = enrollment.student
      ? {
          id: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
          rollNumber: enrollment.student.rollNumber,
          contactNumber: enrollment.student.contactNumber,
        }
      : null;

    const course = enrollment.course
      ? {
          id: enrollment.course.id,
          courseName: enrollment.course.courseName,
          price: enrollment.course.price,
          coverImg: enrollment.course.coverImg,
        }
      : null;

    const txn = enrollment.transactions;
    const enrolledBy = enrollment.enrolledBy
      ? {
          id: enrollment.enrolledBy.id,
          firstName: enrollment.enrolledBy.firstName,
          lastName: enrollment.enrolledBy.lastName,
          email: enrollment.enrolledBy.email,
        }
      : null;

    return {
      id: enrollment.id,
      status: enrollment.status,
      isActive: enrollment.isActive,
      lectureViewed: enrollment.lectureViewed,
      rejectionReason: enrollment.rejectionReason,
      rejectedAt: enrollment.rejectedAt,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      student,
      course,
      transaction: txn
        ? {
            id: txn.id,
            uuid: txn.uuid,
            amount: txn.amount,
            status: txn.status,
            paymentType: txn.paymentType,
            screenshotUrl: txn.screenshotUrl,
            createdAt: txn.createdAt,
            updatedAt: txn.updatedAt,
          }
        : null,
      enrolledBy,
    };
  }

  async checkEnrollment(
    studentId: number,
    courseId: number,
  ): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
      },
    });
  }

  async getEnrollmentById(enrollmentId: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async dismissStudent(
    enrollmentId: number,
    dismissDto: { status?: string },
  ): Promise<{ message: string }> {
    const enrollment = await this.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    enrollment.status = dismissDto.status || 'dismissed';
    enrollment.updatedAt = new Date();
    await this.enrollmentRepository.save(enrollment);
    return { message: 'Student dismissed from course successfully' };
  }

  async adminEnrollStudent(
    courseId: number,
    studentId: number,
    adminId: number,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.usersRepository.findOne({
      where: { id: studentId },
      relations: ['role'],
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.role.id !== 3)
      throw new BadRequestException(
        'User must have student role to be enrolled',
      );

    // Check existing active enrollment
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId, isActive: true },
    });
    if (existing)
      throw new ConflictException('Student is already enrolled in this course');

    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      enrolledBy: adminId as any,
      lectureViewed: 0,
      status: 'enrolled',
      isActive: true,
      createdAt: new Date(),
    });
    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    const coursePrice = course.price ? parseFloat(course.price) : 0;
    const transaction = this.transactionRepository.create({
      uuid: `txn_${Date.now().toString(36)}`,
      enrollId: savedEnrollment.id,
      amount: course.price || '0',
      status: coursePrice === 0 ? 'free' : 'paid',
      paymentType: 'cash',
      createdAt: new Date(),
    });
    await this.transactionRepository.save(transaction);

    // Email
    try {
      const enrollmentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      await this.mailService.sendTemplatedMail(
        student.email,
        'Course Enrollment Confirmation - Podium',
        'enrolled-student',
        {
          studentName: `${student.firstName} ${student.lastName}`,
          courseName: course.courseName,
          coursePrice: course.price || 'Free',
          enrollmentDate,
        },
      );
    } catch (error) {
      console.error('Failed to send enrollment email:', error);
    }

    return savedEnrollment;
  }

  async studentSelfEnroll(
    courseId: number,
    studentId: number,
    screenshot?: Express.Multer.File,
  ): Promise<Enrollment> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.usersRepository.findOne({
      where: { id: studentId },
      relations: ['role'],
    });
    if (!student) throw new NotFoundException('Student not found');

    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
      relations: ['transactions'],
    });

    if (existing) {
      if (existing.status === 'enrolled') {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }

      if (existing.status === 'pending') {
        throw new ConflictException(
          'Enrollment request for this course is already pending',
        );
      }

      if (existing.status === 'rejected') {
        const { canReapply, reapplyAvailableAt } =
          this.getReapplyAvailability(existing);
        if (!canReapply) {
          const hoursLeft = Math.max(
            1,
            Math.ceil(
              ((reapplyAvailableAt?.getTime() ?? Date.now()) - Date.now()) /
                (60 * 60 * 1000),
            ),
          );
          throw new BadRequestException(
            `Your previous enrollment request was rejected. You can request again in ${hoursLeft} hour(s).`,
          );
        }
      } else {
        throw new ConflictException(
          'An enrollment record already exists for this course',
        );
      }
    }

    const coursePrice = course.price ? parseFloat(course.price) : 0;
    const isFree = coursePrice === 0 || course.price === null;

    // Paid course requires screenshot
    if (!isFree && !screenshot) {
      throw new BadRequestException(
        'Payment screenshot is required for paid courses',
      );
    }

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      const uploaded = await this.s3Helper.uploadFile(
        screenshot,
        'enrollments/screenshots',
      );
      screenshotUrl = uploaded.url;
    }

    const now = new Date();
    let savedEnrollment: Enrollment;

    if (existing?.status === 'rejected') {
      // Reuse the same enrollment + transaction after cooldown
      existing.status = isFree ? 'enrolled' : 'pending';
      existing.isActive = true;
      existing.rejectionReason = null;
      existing.rejectedAt = null;
      existing.enrolledBy = studentId as any;
      existing.updatedAt = now;
      savedEnrollment = await this.enrollmentRepository.save(existing);

      const txn =
        existing.transactions ||
        (await this.transactionRepository.findOne({
          where: { enrollId: savedEnrollment.id },
        }));

      if (txn) {
        txn.amount = course.price || '0';
        txn.status = isFree ? 'free' : 'pending';
        txn.paymentType = isFree ? null : 'online';
        txn.screenshotUrl = screenshotUrl;
        txn.updatedAt = now;
        await this.transactionRepository.save(txn);
      } else {
        await this.transactionRepository.save(
          this.transactionRepository.create({
            uuid: `txn_${Date.now().toString(36)}`,
            enrollId: savedEnrollment.id,
            amount: course.price || '0',
            status: isFree ? 'free' : 'pending',
            paymentType: isFree ? null : 'online',
            screenshotUrl,
            createdAt: now,
          }),
        );
      }
    } else {
      const enrollment = this.enrollmentRepository.create({
        studentId,
        courseId,
        enrolledBy: studentId as any,
        lectureViewed: 0,
        status: isFree ? 'enrolled' : 'pending',
        isActive: true,
        rejectionReason: null,
        rejectedAt: null,
        createdAt: now,
      });
      savedEnrollment = await this.enrollmentRepository.save(enrollment);

      await this.transactionRepository.save(
        this.transactionRepository.create({
          uuid: `txn_${Date.now().toString(36)}`,
          enrollId: savedEnrollment.id,
          amount: course.price || '0',
          status: isFree ? 'free' : 'pending',
          paymentType: isFree ? null : 'online',
          screenshotUrl,
          createdAt: now,
        }),
      );
    }

    // Email — free course direct confirmation, paid course "pending review"
    try {
      const enrollmentDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (isFree) {
        await this.mailService.sendTemplatedMail(
          student.email,
          'Course Enrollment Confirmation - Podium',
          'enrolled-student',
          {
            studentName: `${student.firstName} ${student.lastName}`,
            courseName: course.courseName,
            coursePrice: 'Free',
            enrollmentDate,
          },
        );
      } else {
        await this.mailService.sendTemplatedMail(
          student.email,
          'Enrollment Request Received - Podium',
          'enrollment-pending',
          {
            studentName: `${student.firstName} ${student.lastName}`,
            courseName: course.courseName,
            enrollmentDate,
          },
        );
      }
    } catch (error) {
      console.error('Failed to send enrollment email:', error);
    }

    return savedEnrollment;
  }

  async updateEnrollmentStatus(
    enrollmentId: number,
    dto: UpdateEnrollmentStatusDto,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'course', 'transactions'],
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!enrollment.isActive)
      throw new BadRequestException('This enrollment is no longer active');
    if (enrollment.status !== 'pending')
      throw new BadRequestException('Only pending enrollments can be reviewed');

    const updatedAt = new Date();

    // Use TypeORM Transaction for atomicity
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      if (dto.action === EnrollmentAction.APPROVE) {
        // 1. Update Enrollment
        enrollment.status = 'enrolled';
        enrollment.rejectedAt = null;
        enrollment.rejectionReason = null;
        enrollment.updatedAt = updatedAt;
        await transactionalEntityManager.save(enrollment);

        // 2. Update Transaction
        await transactionalEntityManager.update(
          Transactions,
          { enrollId: enrollmentId },
          { status: 'paid', updatedAt },
        );
      } else if (dto.action === EnrollmentAction.REJECT) {
        // 1. Update Enrollment
        enrollment.status = 'rejected';
        enrollment.isActive = false;
        enrollment.rejectionReason = dto.rejectionReason || null;
        enrollment.rejectedAt = updatedAt;
        enrollment.updatedAt = updatedAt;
        await transactionalEntityManager.save(enrollment);

        // 2. Update Transaction Status to failed/rejected
        await transactionalEntityManager.update(
          Transactions,
          { enrollId: enrollmentId },
          { status: 'failed', updatedAt },
        );
      }
    });

    // Background Tasks (Outside DB Transaction)
    this.handlePostStatusUpdateTasks(enrollment, dto.action).catch((err) =>
      console.error('Post-update tasks failed:', err),
    );

    return enrollment;
  }

  private getReapplyAvailability(enrollment: Enrollment): {
    canReapply: boolean;
    reapplyAvailableAt: Date | null;
  } {
    if (enrollment.status !== 'rejected') {
      return { canReapply: false, reapplyAvailableAt: null };
    }

    const rejectedAt =
      enrollment.rejectedAt ?? enrollment.updatedAt ?? enrollment.createdAt;
    if (!rejectedAt) {
      return { canReapply: true, reapplyAvailableAt: null };
    }

    const rejectedTime = new Date(rejectedAt).getTime();
    const reapplyAvailableAt = new Date(rejectedTime + REAPPLY_COOLDOWN_MS);
    const canReapply = Date.now() >= reapplyAvailableAt.getTime();

    return {
      canReapply,
      reapplyAvailableAt: canReapply ? null : reapplyAvailableAt,
    };
  }
}
