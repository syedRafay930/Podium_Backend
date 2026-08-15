import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { AddCourseDto } from './dto/add_course.dto';
import { DeepPartial } from 'typeorm';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Lectures } from 'src/Entities/entities/Lectures';
import { S3Helper } from 'src/S3/s3.helper';
import { EditCourseDto } from './dto/edit_course.dto';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Attendance } from 'src/Entities/entities/Attendance';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/Nodemailer/mailer.service';
import { RedisService } from 'src/Auth/redis.service';
import { AttendanceService } from 'src/Attendance/attendance.service';
import { GoogleCalendarService } from 'src/GoogleCalendar/google-calendar.service';
import { AssignmentSubmissionStatus } from 'src/Assignments/dto/assignment-status.enum';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly adminRepository: Repository<Users>,
    @InjectRepository(Users)
    private readonly teacherRepository: Repository<Users>,
    @InjectRepository(CourseCategory)
    private readonly courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(CourseRating)
    private readonly courseRatingRepository: Repository<CourseRating>,
    @InjectRepository(Lectures)
    private readonly lecturesRepository: Repository<Lectures>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly s3Helper: S3Helper,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async createCourse(courseDto: AddCourseDto, adminId: number, file) {
    const category = await this.courseCategoryRepository.findOneBy({
      id: courseDto.CourseCategoryId,
    });
    if (!category) throw new NotFoundException('Course category not found');

    const courseExists = await this.courseRepository.findOneBy({
      courseName: courseDto.CourseName,
    });
    if (courseExists) throw new ConflictException('Course already exists');

    let teacher: Users | null = null;
    if (courseDto.TeacherId) {
      teacher = await this.teacherRepository.findOneBy({
        id: courseDto.TeacherId,
        role: { id: 2 },
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
    }

    let coverImgUrl: string | null = null;
    if (file) {
      const uploadResult = await this.s3Helper.uploadFile(file, 'courses/covers');
      coverImgUrl = uploadResult.url;
    }

    const courseData: DeepPartial<Courses> = {
      courseName: courseDto.CourseName,
      shortDescription: courseDto.ShortDescription,
      price: courseDto.Price,
      longDescription: courseDto.LongDescription ?? null,
      courseCategory: category,
      createdAt: new Date(),
      createdBy: adminId as any,
      coverImg: coverImgUrl,
      languages: courseDto.Languages ?? null,
      isActive: true,
      invitationToken: teacher ? uuidv4() : undefined,
    };

    const course = this.courseRepository.create(courseData);
    const savedCourse = await this.courseRepository.save(course);

    if (teacher) {
      // Send notification to teacher about the new course assignment
      await this.assignTeacherToCourse(savedCourse.id, teacher.id, adminId);
    }
    return savedCourse;
  }

  async getAllCourses(
    page: number,
    limit: number,
    category?: string,
    search?: string,
    teacherId?: string,
    userId?: number,
    roleId?: number,
  ) {
    const isAdmin = roleId === 1;

    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.createdBy', 'admin')
      .addSelect(['admin.id', 'admin.firstName', 'admin.lastName'])
      .leftJoin('course.courseCategory', 'courseCategory')
      .addSelect(['courseCategory.id', 'courseCategory.name'])
      .leftJoin('course.teacher', 'teacher')
      .addSelect([
        'teacher.id',
        'teacher.firstName',
        'teacher.lastName',
        'teacher.email',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(courseRating.rating)', 'avgRating')
          .from(CourseRating, 'courseRating')
          .where('courseRating.course_id = course.id');
      }, 'avgRating');

    if (category) {
      query.andWhere('courseCategory.id = :category', { category });
    }

    if (search) {
      query.andWhere('course.courseName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (teacherId) {
      query.andWhere('teacher.id = :teacherId', { teacherId });
    }

    // Catalog for students:
    // - hide pending/enrolled/dismissed (already on enrollment page)
    // - hide rejected only during 48h cooldown; after that show again so they can re-apply
    if (userId && roleId === 3) {
      query.andWhere(
        `course.id NOT IN (
          SELECT enrollment.course_id
          FROM enrollment
          WHERE enrollment.student_id = :userId
            AND (
              enrollment.status IN ('pending', 'enrolled', 'dismissed')
              OR (
                enrollment.status = 'rejected'
                AND COALESCE(
                  enrollment.rejected_at,
                  enrollment.updated_at,
                  enrollment.created_at
                ) > NOW() - INTERVAL '48 hours'
              )
            )
        )`,
        { userId },
      );
    }

    const total = await query.getCount();

    query
      .orderBy('course.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const { entities, raw } = await query.getRawAndEntities();
    const courses = entities.map((course, idx) => ({
      ...course,
      avgRating: raw[idx].avgRating ? parseFloat(raw[idx].avgRating) : 0,
    }));

    const meta = {
      totalItems: total,
      itemCount: courses.length,
      itemsPerPage: limit,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };

    if (!isAdmin) {
      return { data: courses, meta };
    }

    const courseIds = courses.map((c) => c.id);
    const enrollmentCountByCourse = new Map<
      number,
      { enrolled: number; pending: number }
    >();

    if (courseIds.length > 0) {
      const enrollmentCounts = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .select('enrollment.courseId', 'courseId')
        .addSelect(
          `SUM(CASE WHEN enrollment.status = 'enrolled' THEN 1 ELSE 0 END)`,
          'enrolled',
        )
        .addSelect(
          `SUM(CASE WHEN enrollment.status = 'pending' THEN 1 ELSE 0 END)`,
          'pending',
        )
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .groupBy('enrollment.courseId')
        .getRawMany();

      for (const row of enrollmentCounts) {
        enrollmentCountByCourse.set(Number(row.courseId), {
          enrolled: Number(row.enrolled ?? 0),
          pending: Number(row.pending ?? 0),
        });
      }
    }

    const [
      activeCourses,
      inactiveCourses,
      withTeacher,
      withoutTeacher,
      pendingTeacherAssignments,
      totalEnrolledStudents,
      pendingEnrollmentRequests,
    ] = await Promise.all([
      this.courseRepository.count({ where: { isActive: true } }),
      this.courseRepository.count({ where: { isActive: false } }),
      this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NOT NULL')
        .getCount(),
      this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacher_id IS NULL')
        .getCount(),
      this.courseRepository.count({ where: { teacherStatus: 'pending' } }),
      this.enrollmentRepository.count({ where: { status: 'enrolled' } }),
      this.enrollmentRepository.count({ where: { status: 'pending' } }),
    ]);

    const data = courses.map((course) => {
      const counts = enrollmentCountByCourse.get(course.id) ?? {
        enrolled: 0,
        pending: 0,
      };

      return {
        id: course.id,
        courseName: course.courseName,
        shortDescription: course.shortDescription,
        price: course.price,
        coverImg: course.coverImg,
        isActive: course.isActive,
        teacherStatus: course.teacherStatus,
        avgRating: course.avgRating,
        totalLectures: course.totalLectures,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        enrolledStudentsCount: counts.enrolled,
        pendingEnrollmentsCount: counts.pending,
        courseCategory: course.courseCategory
          ? {
              id: course.courseCategory.id,
              name: course.courseCategory.name,
            }
          : null,
        teacher: course.teacher
          ? {
              id: course.teacher.id,
              firstName: course.teacher.firstName,
              lastName: course.teacher.lastName,
              email: course.teacher.email,
            }
          : null,
        createdBy: course.createdBy
          ? {
              id: course.createdBy.id,
              firstName: course.createdBy.firstName,
              lastName: course.createdBy.lastName,
            }
          : null,
      };
    });

    return {
      data,
      meta,
      stats: {
        totalCourses: total,
        activeCourses,
        inactiveCourses,
        withTeacher,
        withoutTeacher,
        pendingTeacherAssignments,
        totalEnrolledStudents,
        pendingEnrollmentRequests,
      },
    };
  }

  async getCourseById(courseId: number, userId?: number, userRole?: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher', 'lectures'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const ratingStats = await this.courseRatingRepository
      .createQueryBuilder('rating')
      .select('COUNT(rating.id)', 'count')
      .addSelect('AVG(rating.rating)', 'average')
      .where('rating.course_id = :id', { id: courseId })
      .getRawOne();

    const baseResponse = {
      ...course,
      ratingCount: Number(ratingStats.count) || 0,
      averageRating: Number(ratingStats.average) || 0,
    };

    return baseResponse;
  }

  async updateCourse(
    courseId: number,
    courseDto: EditCourseDto,
    adminId: number,
    file?: Express.Multer.File,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Update category if provided
    if (courseDto.CourseCategoryId) {
      const category = await this.courseCategoryRepository.findOneBy({
        id: courseDto.CourseCategoryId,
      });
      if (!category) {
        throw new NotFoundException('Course category not found');
      }
      course.courseCategory = category;
    }

    // Update teacher if provided
    if (courseDto.TeacherId) {
      const teacher = await this.teacherRepository.findOneBy({
        id: courseDto.TeacherId,
        role: { id: 2 },
      });
      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }
      course.teacher = teacher;
    }

    // Update course image if file provided
    if (file) {
      const uploadResult = await this.s3Helper.uploadFile(file, 'courses/covers');
      course.coverImg = uploadResult.url;
    }

    // Update other fields
    if (courseDto.CourseName) {
      // Check if course name already exists (excluding current course)
      const existingCourse = await this.courseRepository.findOne({
        where: {
          courseName: courseDto.CourseName,
        },
      });
      if (existingCourse && existingCourse.id !== courseId) {
        throw new ConflictException('A course with this name already exists');
      }
      course.courseName = courseDto.CourseName;
    }

    if (courseDto.ShortDescription) {
      course.shortDescription = courseDto.ShortDescription;
    }

    if (courseDto.Price) {
      course.price = courseDto.Price;
    }

    if (courseDto.LongDescription !== undefined) {
      course.longDescription = courseDto.LongDescription;
    }

    if (courseDto.Languages) {
      course.languages = courseDto.Languages;
    }

    if (courseDto.isActive) {
      course.isActive = courseDto.isActive;
    }

    course.updatedAt = new Date();
    course.updatedBy = adminId as any;

    const updatedCourse = await this.courseRepository.save(course);

    // Return course with all relations and stats
    return this.getCourseById(updatedCourse.id, adminId, 1);
  }

  async getAllCategories() {
    const categories = await this.courseCategoryRepository.find({
      order: {
        id: 'ASC',
      },
    });

    return categories;
  }

  // ==================== TEACHER ASSIGNMENT ====================

  async assignTeacherToCourse(
    courseId: number,
    teacherId: number,
    adminId: number,
  ): Promise<{ message: string; invitationToken: string }> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify teacher exists and has teacher role
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId, role: { id: 2 } },
      relations: ['role'],
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found or invalid teacher role');
    }

    // Generate unique invitation token
    const invitationToken = uuidv4();

    // Update course with teacher and set status to pending
    course.teacher = teacher;
    course.teacherStatus = 'pending';
    course.invitationToken = invitationToken;

    await this.courseRepository.save(course);

    // Store token in Redis with 24-hour expiry
    await this.redisService.setValue(
      `teacher-invite:${invitationToken}`,
      JSON.stringify({
        courseId,
        teacherId,
        courseName: course.courseName,
      }),
      86400, // 24 hours
    );

    // Send email to teacher
    try {
      const acceptLink = `http://localhost:3006/courses/${courseId}/teacher/action/${invitationToken}?action=accept`;
      const rejectLink = `http://localhost:3006/courses/${courseId}/teacher/action/${invitationToken}?action=reject`;

      await this.mailService.sendTemplatedMail(
        teacher.email,
        'Course Teaching Assignment - Action Required',
        'teacher-assignment',
        {
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          courseName: course.courseName,
          courseDescription:
            course.longDescription ||
            course.shortDescription ||
            'No description',
          coursePrice: course.price || 'Free',
          acceptLink,
          rejectLink,
        },
      );
    } catch (error) {
      console.error('Failed to send teacher assignment email:', error);
      // Don't throw error - assignment should succeed even if email fails
    }

    return {
      message: `Teacher assigned to course. Invitation email sent to ${teacher.email}`,
      invitationToken,
    };
  }

  async handleTeacherAction(
    courseId: number,
    invitationToken: string,
    action: 'accept' | 'reject',
  ): Promise<{ message: string; courseName: string }> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify token exists in Redis
    const tokenData = await this.redisService.getValue(
      `teacher-invite:${invitationToken}`,
    );

    if (!tokenData) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    // Verify token matches the course
    const parsedData = JSON.parse(tokenData);
    if (parsedData.courseId != courseId) {
      throw new UnauthorizedException('Token does not match the course');
    }

    if (action === 'accept') {
      course.teacherStatus = 'accepted';
      course.invitationToken = null;
      await this.courseRepository.save(course);

      // Delete token from Redis
      await this.redisService.deleteValue(`teacher-invite:${invitationToken}`);

      return {
        message: 'Course assignment accepted successfully!',
        courseName: course.courseName,
      };
    } else if (action === 'reject') {
      // Keep teacher linked so admin can see who rejected and reassign
      course.teacherStatus = 'rejected';
      course.invitationToken = null;
      await this.courseRepository.save(course);

      // Delete token from Redis
      await this.redisService.deleteValue(`teacher-invite:${invitationToken}`);

      return {
        message: 'Course assignment rejected',
        courseName: course.courseName,
      };
    } else {
      throw new UnauthorizedException('Invalid action');
    }
  }

  /* =====================================================
     ADMIN: TEACHER ASSIGNMENTS QUEUE
     ===================================================== */

  async getAdminTeacherAssignments(
    page: number = 1,
    limit: number = 10,
    status?: 'pending' | 'accepted' | 'rejected' | 'unassigned',
    teacherName?: string,
    courseName?: string,
    teacherId?: number,
  ) {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.courseCategory', 'courseCategory')
      .orderBy('course.updatedAt', 'DESC')
      .addOrderBy('course.createdAt', 'DESC');

    if (status === 'unassigned') {
      query.andWhere('course.teacher_id IS NULL');
    } else if (status) {
      query
        .andWhere('course.teacher_id IS NOT NULL')
        .andWhere('course.teacherStatus = :status', { status });
    }

    if (teacherId) {
      query.andWhere('teacher.id = :teacherId', { teacherId });
    }

    if (teacherName) {
      query.andWhere(
        "CONCAT(teacher.firstName, ' ', teacher.lastName) ILIKE :teacherName",
        { teacherName: `%${teacherName}%` },
      );
    }

    if (courseName) {
      query.andWhere('course.courseName ILIKE :courseName', {
        courseName: `%${courseName}%`,
      });
    }

    const total = await query.getCount();
    query.skip((page - 1) * limit).take(limit);
    const courses = await query.getMany();

    const [pending, accepted, rejected, unassigned, totalAll] =
      await Promise.all([
        this.courseRepository
          .createQueryBuilder('course')
          .where('course.teacher_id IS NOT NULL')
          .andWhere('course.teacherStatus = :status', { status: 'pending' })
          .getCount(),
        this.courseRepository
          .createQueryBuilder('course')
          .where('course.teacher_id IS NOT NULL')
          .andWhere('course.teacherStatus = :status', { status: 'accepted' })
          .getCount(),
        this.courseRepository
          .createQueryBuilder('course')
          .where('course.teacher_id IS NOT NULL')
          .andWhere('course.teacherStatus = :status', { status: 'rejected' })
          .getCount(),
        this.courseRepository
          .createQueryBuilder('course')
          .where('course.teacher_id IS NULL')
          .getCount(),
        this.courseRepository.count(),
      ]);

    const data = courses.map((course) => {
      const assignmentStatus: 'pending' | 'accepted' | 'rejected' | 'unassigned' =
        !course.teacher
          ? 'unassigned'
          : (course.teacherStatus as 'pending' | 'accepted' | 'rejected');

      return {
        courseId: course.id,
        courseName: course.courseName,
        shortDescription: course.shortDescription,
        price: course.price,
        coverImg: course.coverImg,
        isActive: course.isActive,
        assignmentStatus,
        needsAction: assignmentStatus === 'pending',
        teacher: course.teacher
          ? {
              id: course.teacher.id,
              firstName: course.teacher.firstName,
              lastName: course.teacher.lastName,
              email: course.teacher.email,
              contactNumber: course.teacher.contactNumber,
            }
          : null,
        courseCategory: course.courseCategory
          ? {
              id: course.courseCategory.id,
              name: course.courseCategory.name,
            }
          : null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    });

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit) || 0,
        currentPage: page,
      },
      stats: {
        total: totalAll,
        pending,
        accepted,
        rejected,
        unassigned,
      },
    };
  }

  /* =====================================================
     TEACHER: ASSIGNED COURSES LIST (PENDING / ACCEPTED)
     ===================================================== */

  async getTeacherAssignedCourses(
    teacherId: number,
    page = 1,
    limit = 10,
    status?: 'pending' | 'accepted',
  ) {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.createdBy', 'admin')
      .addSelect(['admin.id', 'admin.firstName', 'admin.lastName'])
      .leftJoin('course.courseCategory', 'courseCategory')
      .addSelect(['courseCategory.id', 'courseCategory.name'])
      .leftJoin('course.teacher', 'teacher')
      .addSelect(['teacher.id', 'teacher.firstName', 'teacher.lastName'])
      .where('teacher.id = :teacherId', { teacherId })
      .orderBy('course.updatedAt', 'DESC')
      .addOrderBy('course.createdAt', 'DESC');

    if (status) {
      query.andWhere('course.teacherStatus = :status', { status });
    } else {
      // Default: actionable + previously accepted (rejected kept for admin history)
      query.andWhere('course.teacherStatus IN (:...statuses)', {
        statuses: ['pending', 'accepted'],
      });
    }

    const total = await query.getCount();
    query.skip((page - 1) * limit).take(limit);

    const courses = await query.getMany();

    const [pendingCount, acceptedCount] = await Promise.all([
      this.courseRepository.count({
        where: { teacher: { id: teacherId }, teacherStatus: 'pending' },
      }),
      this.courseRepository.count({
        where: { teacher: { id: teacherId }, teacherStatus: 'accepted' },
      }),
    ]);

    const data = courses.map((course) => {
      const { invitationToken: _invitationToken, ...safeCourse } = course;
      return {
        ...safeCourse,
        teacherStatus: course.teacherStatus,
        needsAction: course.teacherStatus === 'pending',
      };
    });

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      summary: {
        pending: pendingCount,
        accepted: acceptedCount,
        filter: status ?? 'all',
      },
    };
  }

  /* =====================================================
     TEACHER: ACCEPT / REJECT ASSIGNMENT (JWT IN-APP)
     ===================================================== */

  async respondToTeacherAssignment(
    courseId: number,
    teacherId: number,
    action: 'accept' | 'reject',
  ): Promise<{ message: string; courseName: string; teacherStatus: string }> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.teacher || course.teacher.id !== teacherId) {
      throw new ForbiddenException(
        'You are not assigned to this course',
      );
    }

    if (course.teacherStatus !== 'pending') {
      throw new BadRequestException(
        `Course assignment is already ${course.teacherStatus}`,
      );
    }

    const token = course.invitationToken;

    if (action === 'accept') {
      course.teacherStatus = 'accepted';
      course.invitationToken = null;
      await this.courseRepository.save(course);

      if (token) {
        await this.redisService.deleteValue(`teacher-invite:${token}`);
      }

      return {
        message: 'Course assignment accepted successfully!',
        courseName: course.courseName,
        teacherStatus: 'accepted',
      };
    }

    if (action === 'reject') {
      // Keep teacher linked so admin can see who rejected and reassign
      course.teacherStatus = 'rejected';
      course.invitationToken = null;
      await this.courseRepository.save(course);

      if (token) {
        await this.redisService.deleteValue(`teacher-invite:${token}`);
      }

      return {
        message: 'Course assignment rejected',
        courseName: course.courseName,
        teacherStatus: 'rejected',
      };
    }

    throw new BadRequestException('Invalid action');
  }

  /* =====================================================
     TEACHER: DASHBOARD HOME AGGREGATE
     ===================================================== */

  async myDashboard(teacherId: number) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['role'],
    });

    if (!teacher || teacher.isDelete) {
      throw new NotFoundException('Teacher not found');
    }

    const [
      acceptedCoursesResult,
      pendingCoursesResult,
      recentAttendanceRows,
      googleStatus,
      unmarkedAttendanceCount,
      submissionsToGradeCount,
    ] = await Promise.all([
      this.getTeacherAssignedCourses(teacherId, 1, 4, 'accepted'),
      this.getTeacherAssignedCourses(teacherId, 1, 5, 'pending'),
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.lecture', 'lecture')
        .leftJoinAndSelect('lecture.course', 'course')
        .innerJoin('attendance.teacher', 'teacher')
        .where('teacher.id = :teacherId', { teacherId })
        .orderBy('attendance.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.googleCalendarService.getConnectionStatus(teacherId),
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .innerJoin('attendance.teacher', 'teacher')
        .where('teacher.id = :teacherId', { teacherId })
        .andWhere('attendance.isMarked = false')
        .getCount(),
      this.assignmentSubmissionRepository
        .createQueryBuilder('submission')
        .innerJoin('submission.assignment', 'assignment')
        .innerJoin('assignment.course', 'course')
        .innerJoin('course.teacher', 'teacher')
        .where('teacher.id = :teacherId', { teacherId })
        .andWhere('course.teacherStatus = :accepted', { accepted: 'accepted' })
        .andWhere('submission.status IN (:...statuses)', {
          statuses: [
            AssignmentSubmissionStatus.SUBMITTED,
            AssignmentSubmissionStatus.LATE,
          ],
        })
        .getCount(),
    ]);

    const acceptedCourseIds = acceptedCoursesResult.data.map((c) => c.id);

    const enrollmentCounts =
      acceptedCourseIds.length > 0
        ? await this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .select('enrollment.courseId', 'courseId')
            .addSelect('COUNT(enrollment.id)', 'count')
            .where('enrollment.courseId IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('enrollment.status = :status', { status: 'enrolled' })
            .groupBy('enrollment.courseId')
            .getRawMany()
        : [];

    const enrollmentCountByCourse = new Map<number, number>();
    for (const row of enrollmentCounts) {
      enrollmentCountByCourse.set(Number(row.courseId), Number(row.count));
    }

    const studentsEnrolledCount =
      acceptedCourseIds.length > 0
        ? await this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .where('enrollment.courseId IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('enrollment.status = :status', { status: 'enrolled' })
            .getCount()
        : 0;

    const gradingQueueRaw =
      acceptedCourseIds.length > 0
        ? await this.assignmentSubmissionRepository
            .createQueryBuilder('submission')
            .innerJoin('submission.assignment', 'assignment')
            .innerJoin('assignment.course', 'course')
            .select('assignment.id', 'assignmentId')
            .addSelect('assignment.title', 'title')
            .addSelect('assignment.dueDate', 'dueDate')
            .addSelect('course.id', 'courseId')
            .addSelect('course.courseName', 'courseName')
            .addSelect('COUNT(submission.id)', 'pendingSubmissionCount')
            .where('course.id IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('submission.status IN (:...statuses)', {
              statuses: [
                AssignmentSubmissionStatus.SUBMITTED,
                AssignmentSubmissionStatus.LATE,
              ],
            })
            .groupBy('assignment.id')
            .addGroupBy('assignment.title')
            .addGroupBy('assignment.dueDate')
            .addGroupBy('course.id')
            .addGroupBy('course.courseName')
            .orderBy('COUNT(submission.id)', 'DESC')
            .limit(5)
            .getRawMany()
        : [];

    const recentCourses = acceptedCoursesResult.data.map((course) => ({
      courseId: course.id,
      courseName: course.courseName,
      coverImg: course.coverImg ?? null,
      shortDescription: course.shortDescription ?? null,
      teacherStatus: course.teacherStatus,
      enrolledStudentsCount: enrollmentCountByCourse.get(course.id) ?? 0,
    }));

    const pendingCourseAssignments = pendingCoursesResult.data.map(
      (course) => ({
        courseId: course.id,
        courseName: course.courseName,
        coverImg: course.coverImg ?? null,
        shortDescription: course.shortDescription ?? null,
        teacherStatus: course.teacherStatus,
        needsAction: true,
        createdAt: course.createdAt ?? null,
        updatedAt: course.updatedAt ?? null,
      }),
    );

    const gradingQueue = gradingQueueRaw.map((row) => ({
      assignmentId: Number(row.assignmentId),
      title: row.title,
      courseId: Number(row.courseId),
      courseName: row.courseName,
      dueDate: row.dueDate ?? null,
      pendingSubmissionCount: Number(row.pendingSubmissionCount),
    }));

    const recentAttendance = recentAttendanceRows.map((attendance) => ({
      attendanceId: attendance.id,
      attendanceDate: attendance.attendanceDate,
      isMarked: !!attendance.isMarked,
      lectureTitle: attendance.lecture?.title ?? 'Lecture',
      lectureId: attendance.lecture?.id ?? null,
      courseId: attendance.lecture?.course?.id ?? null,
      courseName: attendance.lecture?.course?.courseName ?? null,
    }));

    return {
      welcome: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
      },
      metrics: {
        acceptedCoursesCount: acceptedCoursesResult.summary.accepted,
        pendingCourseAssignmentCount: pendingCoursesResult.summary.pending,
        studentsEnrolledCount,
        submissionsToGradeCount,
        unmarkedAttendanceCount,
        googleCalendarConnected: !!googleStatus.connected,
      },
      recentCourses,
      pendingCourseAssignments,
      gradingQueue,
      recentAttendance,
      googleCalendar: {
        connected: !!googleStatus.connected,
        googleEmail: googleStatus.googleEmail ?? null,
      },
    };
  }
}
