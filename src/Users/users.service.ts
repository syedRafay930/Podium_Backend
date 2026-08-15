import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../Auth/redis.service';
import { Users } from 'src/Entities/entities/Users';
import { UserRole } from 'src/Entities/entities/UserRole';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { Transactions } from 'src/Entities/entities/Transactions';
import { Courses } from 'src/Entities/entities/Courses';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Attendance } from 'src/Entities/entities/Attendance';
import { MailService } from 'src/Nodemailer/mailer.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { EditStudentDto } from './dto/edit-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { EditTeacherDto } from './dto/edit-teacher.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(AttendanceDetails)
    private readonly attendanceDetailsRepository: Repository<AttendanceDetails>,

    @InjectRepository(Courses)
    private readonly coursesRepository: Repository<Courses>,

    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmission>,

    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Users | null> {
    return this.usersRepository.findOne({
      where: { email: ILike(email.trim()) },
      relations: ['role'],
    });
  }

  async findById(id: number): Promise<Users | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: ILike(userEmail.trim()) },
    });

    if (user) {
      await this.usersRepository.update(
        { id: user.id },
        {
          hashedPassword: newPassword,
          isActive: true,
          updatedAt: new Date(),
          updatedBy: user,
        },
      );
    }
  }

  private getFrontendBaseUrl(): string {
    const configured = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (!configured || configured.includes('localhost')) {
      return 'https://www.podium.com.pk';
    }
    return configured.replace(/\/$/, '');
  }

  private generateTempPassword(): string {
    // Starts with a capital letter so frontend password validation passes
    return `Podium${Date.now().toString(36)}`;
  }

  // Helper method to generate password reset token and link
  private async generateResetLink(email: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: email },
      {
        secret: this.configService.get<string>('RESET_SECRET'),
        expiresIn: '24h',
      },
    );

    await this.redisService.setValue(`forgot:${token}`, email, 86400); // 24 hours

    return `${this.getFrontendBaseUrl()}/resetpassword/${token}`;
  }

  // ==================== STUDENT CRUD ====================

  async createStudent(
    createStudentDto: CreateStudentDto,
    adminId?: number,
  ): Promise<any> {
    // Check if email already exists
    const existingStudent = await this.usersRepository.findOne({
      where: { email: createStudentDto.email },
    });

    if (existingStudent) {
      throw new ConflictException('Email already exists');
    }

    // Get student role (role_id = 3)
    const studentRole = await this.userRoleRepository.findOne({
      where: { id: 3 },
    });

    if (!studentRole) {
      throw new NotFoundException('Student role not found');
    }

    // Hash password
    let finalPassword = createStudentDto.password;
    let tempPassword = '';
    if (!finalPassword) {
      tempPassword = this.generateTempPassword();
      finalPassword = tempPassword;
    }
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // Create student
    const student = this.usersRepository.create({
      firstName: createStudentDto.firstName,
      lastName: createStudentDto.lastName,
      email: createStudentDto.email.trim().toLowerCase(),
      hashedPassword,
      contactNumber: createStudentDto.contactNumber || null,
      isActive: true,
      role: studentRole,
      createdBy: adminId ? (adminId as any) : null,
      createdAt: new Date(),
    });

    const savedStudent = await this.usersRepository.save(student);

    const freshStudent = await this.usersRepository.findOne({
      where: { id: savedStudent.id },
      relations: ['role'],
    });

    // Send onboarding email with credentials
    try {
      const resetLink = await this.generateResetLink(createStudentDto.email);
      await this.mailService.sendTemplatedMail(
        createStudentDto.email,
        'Welcome to Podium - Student Account Created',
        'user-onboarded',
        {
          userName: `${createStudentDto.firstName} ${createStudentDto.lastName}`,
          userRole: 'Student',
          email: createStudentDto.email,
          password: tempPassword || 'Your chosen password',
          resetLink,
          rollNumber: freshStudent?.rollNumber || 'N/A',
        },
      );
    } catch (error) {
      console.error('Failed to send student onboarding email:', error);
    }

    return {
      id: freshStudent?.id,
      firstName: freshStudent?.firstName,
      lastName: freshStudent?.lastName,
      email: freshStudent?.email,
      contactNumber: freshStudent?.contactNumber,
      role: freshStudent?.role?.roleName || 'Student',
      rollNumber: freshStudent?.rollNumber,
      isActive: freshStudent?.isActive,
      createdAt: freshStudent?.createdAt,
    };
  }

  async getAllStudents(page: number = 1, limit: number = 10): Promise<any> {
    const [students, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 3 }, isDelete: false },
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const formattedStudents = students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      contactNumber: student.contactNumber,
      role: student.role?.roleName || 'Student',
      rollNumber: student.rollNumber,
      isActive: student.isActive,
      createdAt: student.createdAt,
    }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeStudents,
      inactiveStudents,
      studentsWithEnrollments,
      pendingEnrollmentRequests,
      newStudentsThisMonth,
    ] = await Promise.all([
      this.usersRepository.count({
        where: { role: { id: 3 }, isDelete: false, isActive: true },
      }),
      this.usersRepository.count({
        where: { role: { id: 3 }, isDelete: false, isActive: false },
      }),
      this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.student', 'student')
        .innerJoin('student.role', 'role')
        .where('role.id = :roleId', { roleId: 3 })
        .andWhere('student.isDelete = false')
        .andWhere('enrollment.status = :status', { status: 'enrolled' })
        .select('COUNT(DISTINCT enrollment.studentId)', 'count')
        .getRawOne()
        .then((row) => Number(row?.count ?? 0)),
      this.enrollmentRepository.count({
        where: { status: 'pending' },
      }),
      this.usersRepository
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('role.id = :roleId', { roleId: 3 })
        .andWhere('user.isDelete = false')
        .andWhere('user.createdAt >= :monthStart', { monthStart })
        .getCount(),
    ]);

    return {
      data: formattedStudents,
      meta: {
        totalItems: total,
        itemCount: students.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      stats: {
        totalStudents: total,
        activeStudents,
        inactiveStudents,
        studentsWithEnrollments,
        pendingEnrollmentRequests,
        newStudentsThisMonth,
      },
    };
  }

  async getUserById(userId: number): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getStudentById(studentId: number): Promise<any> {
    const student = await this.usersRepository.findOne({
      where: { id: studentId, role: { id: 3 }, isDelete: false },
      relations: ['role'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [enrollments, attendanceDetails] = await Promise.all([
      this.enrollmentRepository.find({
        where: { studentId },
        relations: ['course', 'course.teacher', 'transactions'],
        order: { createdAt: 'DESC' },
      }),
      this.attendanceDetailsRepository
        .createQueryBuilder('details')
        .innerJoinAndSelect('details.attendance', 'attendance')
        .innerJoinAndSelect('attendance.lecture', 'lecture')
        .innerJoinAndSelect('lecture.course', 'course')
        .where('details.student_id = :studentId', { studentId })
        .andWhere('lecture.isDelete = false')
        .orderBy('attendance.attendanceDate', 'DESC')
        .addOrderBy('lecture.lectureOrder', 'ASC')
        .getMany(),
    ]);

    const enrolledCourses = enrollments.filter(
      (e) => e.status === 'enrolled',
    ).length;
    const pendingEnrollments = enrollments.filter(
      (e) => e.status === 'pending',
    ).length;
    const rejectedEnrollments = enrollments.filter(
      (e) => e.status === 'rejected',
    ).length;

    const attendancePresent = attendanceDetails.filter(
      (d) => d.status?.toLowerCase() === 'present',
    ).length;
    const attendanceAbsent = attendanceDetails.filter(
      (d) => d.status?.toLowerCase() === 'absent',
    ).length;
    const marked = attendancePresent + attendanceAbsent;
    const attendanceRatePercent = marked
      ? Math.round((attendancePresent / marked) * 1000) / 10
      : null;

    const transactions = enrollments
      .map((e) => e.transactions)
      .filter((t): t is Transactions => !!t);

    const paidTransactions = transactions.filter((t) => t.status === 'paid');
    const pendingPayments = transactions.filter(
      (t) => t.status === 'pending',
    ).length;
    const failedPayments = transactions.filter(
      (t) => t.status === 'failed',
    ).length;
    const totalPaidAmount = paidTransactions
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      .toFixed(2);

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        contactNumber: student.contactNumber,
        rollNumber: student.rollNumber,
        role: student.role?.roleName || 'Student',
        isActive: student.isActive,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      stats: {
        enrolledCourses,
        pendingEnrollments,
        rejectedEnrollments,
        totalEnrollments: enrollments.length,
        attendancePresent,
        attendanceAbsent,
        attendanceRatePercent,
        paidTransactions: paidTransactions.length,
        pendingPayments,
        failedPayments,
        totalPaidAmount,
      },
      enrollments: enrollments.map((enrollment) => {
        const teacher = enrollment.course?.teacher
          ? {
              id: enrollment.course.teacher.id,
              firstName: enrollment.course.teacher.firstName,
              lastName: enrollment.course.teacher.lastName,
              email: enrollment.course.teacher.email,
            }
          : null;

        const txn = enrollment.transactions;

        return {
          id: enrollment.id,
          status: enrollment.status,
          isActive: enrollment.isActive,
          lectureViewed: enrollment.lectureViewed,
          rejectionReason: enrollment.rejectionReason,
          rejectedAt: enrollment.rejectedAt,
          createdAt: enrollment.createdAt,
          updatedAt: enrollment.updatedAt,
          course: enrollment.course
            ? {
                id: enrollment.course.id,
                courseName: enrollment.course.courseName,
                price: enrollment.course.price,
                coverImg: enrollment.course.coverImg,
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
      }),
      recentAttendance: attendanceDetails.slice(0, 10).map((detail) => ({
        attendanceId: detail.attendance.id,
        attendanceDate: detail.attendance.attendanceDate,
        status: detail.status,
        lectureTitle: detail.attendance.lecture?.title ?? null,
        courseName: detail.attendance.lecture?.course?.courseName ?? null,
        courseId: detail.attendance.lecture?.course?.id ?? null,
      })),
    };
  }

  async updateUser(
    userId: number,
    editStudentDto: EditStudentDto,
    adminId: number,
  ): Promise<Users> {
    const user = await this.getUserById(userId);
    // Check if email is being changed and if it already exists
    if (editStudentDto.email && editStudentDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: editStudentDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
      user.email = editStudentDto.email;
    }

    if (editStudentDto.firstName) {
      user.firstName = editStudentDto.firstName;
    }

    if (editStudentDto.lastName) {
      user.lastName = editStudentDto.lastName;
    }

    if (editStudentDto.password) {
      user.hashedPassword = await bcrypt.hash(editStudentDto.password, 12);
    }

    if (editStudentDto.contactNumber !== undefined) {
      user.contactNumber = editStudentDto.contactNumber;
    }

    if (editStudentDto.isActive !== undefined) {
      user.isActive = editStudentDto.isActive;
    }

    user.updatedAt = new Date();
    user.updatedBy = adminId as any;
    return this.usersRepository.save(user);
  }

  async updateSelf(
    targetUserId: number,
    editDto: EditStudentDto,
    requesterId: number,
  ): Promise<Partial<Users>> {
    if (!editDto || Object.keys(editDto).length === 0) {
      throw new BadRequestException('Request body cannot be empty');
    }

    if (targetUserId !== requesterId) {
      throw new ForbiddenException('You can only update your own information');
    }

    const user = await this.getUserById(targetUserId);

    // Only safe fields allowed
    if (editDto.firstName) user.firstName = editDto.firstName;
    if (editDto.lastName) user.lastName = editDto.lastName;
    if (editDto.contactNumber !== undefined)
      user.contactNumber = editDto.contactNumber;

    if (editDto.email && editDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: editDto.email },
      });
      if (existingUser) throw new ConflictException('Email already exists');
      user.email = editDto.email.toLowerCase().trim();
    }

    if (editDto.password) {
      user.hashedPassword = await bcrypt.hash(editDto.password, 12);
    }

    user.updatedAt = new Date();

    const updatedUser = await this.usersRepository.save(user);

    const { hashedPassword, isActive, role, createdBy, ...safeUser } =
      updatedUser;
    return safeUser;
  }

  async deleteStudent(
    studentId: number,
    adminId: number,
  ): Promise<{ message: string }> {
    const student = await this.getUserById(studentId);

    student.isDelete = true;
    student.deletedAt = new Date();
    student.deletedBy = adminId as any;

    await this.usersRepository.save(student);

    return {
      message: `Student ${student.firstName} ${student.lastName} deleted successfully`,
    };
  }

  // ==================== TEACHER CRUD ====================

  async createTeacher(
    createTeacherDto: CreateTeacherDto,
    adminId: number,
  ): Promise<Users> {
    const email = createTeacherDto.email.trim().toLowerCase();

    // Check if email already exists
    const existingTeacher = await this.usersRepository.findOne({
      where: { email: ILike(email) },
    });

    if (existingTeacher) {
      throw new ConflictException('Email already exists');
    }

    // Get teacher role (role_id = 2)
    const teacherRole = await this.userRoleRepository.findOne({
      where: { id: 2 },
    });

    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found');
    }

    // Generate temporary password (starts with a capital letter for frontend validation)
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create teacher — always active so they can log in with the emailed password
    const teacher = this.usersRepository.create({
      firstName: createTeacherDto.firstName,
      lastName: createTeacherDto.lastName,
      email,
      hashedPassword,
      contactNumber: createTeacherDto.contactNumber || null,
      isActive: true,
      role: teacherRole,
      createdBy: adminId as any,
      createdAt: new Date(),
    });

    const savedTeacher = await this.usersRepository.save(teacher);

    // Send onboarding email with credentials
    try {
      const resetLink = await this.generateResetLink(email);
      await this.mailService.sendTemplatedMail(
        email,
        'Welcome to Podium - Teacher Account Created',
        'user-onboarded',
        {
          userName: `${createTeacherDto.firstName} ${createTeacherDto.lastName}`,
          userRole: 'Teacher',
          email,
          password: tempPassword,
          resetLink,
        },
      );
    } catch (error) {
      console.error('Failed to send teacher onboarding email:', error);
      // Don't throw error - teacher creation should succeed even if email fails
    }

    return savedTeacher;
  }

  async getAllTeachers(page: number = 1, limit: number = 10): Promise<any> {
    const [teachers, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 2 }, isDelete: false },
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const formattedTeachers = teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      contactNumber: teacher.contactNumber,
      role: teacher.role?.roleName || 'Teacher',
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
    }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeTeachers,
      inactiveTeachers,
      teachersWithAcceptedCourses,
      pendingCourseAssignments,
      newTeachersThisMonth,
    ] = await Promise.all([
      this.usersRepository.count({
        where: { role: { id: 2 }, isDelete: false, isActive: true },
      }),
      this.usersRepository.count({
        where: { role: { id: 2 }, isDelete: false, isActive: false },
      }),
      this.coursesRepository
        .createQueryBuilder('course')
        .innerJoin('course.teacher', 'teacher')
        .innerJoin('teacher.role', 'role')
        .where('role.id = :roleId', { roleId: 2 })
        .andWhere('teacher.isDelete = false')
        .andWhere('course.teacherStatus = :status', { status: 'accepted' })
        .select('COUNT(DISTINCT teacher.id)', 'count')
        .getRawOne()
        .then((row) => Number(row?.count ?? 0)),
      this.coursesRepository.count({
        where: { teacherStatus: 'pending' },
      }),
      this.usersRepository
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('role.id = :roleId', { roleId: 2 })
        .andWhere('user.isDelete = false')
        .andWhere('user.createdAt >= :monthStart', { monthStart })
        .getCount(),
    ]);

    return {
      data: formattedTeachers,
      meta: {
        totalItems: total,
        itemCount: teachers.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      stats: {
        totalTeachers: total,
        activeTeachers,
        inactiveTeachers,
        teachersWithAcceptedCourses,
        pendingCourseAssignments,
        newTeachersThisMonth,
      },
    };
  }

  private async findTeacherEntity(teacherId: number): Promise<Users> {
    const teacher = await this.usersRepository.findOne({
      where: { id: teacherId, role: { id: 2 }, isDelete: false },
      relations: ['role'],
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async getTeacherById(teacherId: number): Promise<any> {
    const teacher = await this.findTeacherEntity(teacherId);

    const courses = await this.coursesRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['courseCategory'],
      order: { createdAt: 'DESC' },
    });

    const acceptedCourses = courses.filter(
      (c) => c.teacherStatus === 'accepted',
    );
    const pendingCourseAssignments = courses.filter(
      (c) => c.teacherStatus === 'pending',
    ).length;
    const acceptedCourseIds = acceptedCourses.map((c) => c.id);

    const [
      enrollmentCounts,
      studentsEnrolled,
      pendingSubmissionsToGrade,
      unmarkedAttendanceSessions,
    ] = await Promise.all([
      acceptedCourseIds.length > 0
        ? this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .select('enrollment.courseId', 'courseId')
            .addSelect('COUNT(enrollment.id)', 'count')
            .where('enrollment.courseId IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('enrollment.status = :status', { status: 'enrolled' })
            .groupBy('enrollment.courseId')
            .getRawMany()
        : Promise.resolve([] as { courseId: string; count: string }[]),
      acceptedCourseIds.length > 0
        ? this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .where('enrollment.courseId IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('enrollment.status = :status', { status: 'enrolled' })
            .getCount()
        : Promise.resolve(0),
      acceptedCourseIds.length > 0
        ? this.assignmentSubmissionRepository
            .createQueryBuilder('submission')
            .innerJoin('submission.assignment', 'assignment')
            .innerJoin('assignment.course', 'course')
            .where('course.id IN (:...courseIds)', {
              courseIds: acceptedCourseIds,
            })
            .andWhere('submission.status IN (:...statuses)', {
              statuses: ['submitted', 'late'],
            })
            .getCount()
        : Promise.resolve(0),
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .innerJoin('attendance.teacher', 'teacher')
        .where('teacher.id = :teacherId', { teacherId })
        .andWhere('attendance.isMarked = false')
        .getCount(),
    ]);

    const enrollmentCountByCourse = new Map<number, number>();
    for (const row of enrollmentCounts) {
      enrollmentCountByCourse.set(Number(row.courseId), Number(row.count));
    }

    return {
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        contactNumber: teacher.contactNumber,
        role: teacher.role?.roleName || 'Teacher',
        isActive: teacher.isActive,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      },
      stats: {
        acceptedCourses: acceptedCourses.length,
        pendingCourseAssignments,
        totalAssignedCourses: courses.length,
        studentsEnrolled,
        pendingSubmissionsToGrade,
        unmarkedAttendanceSessions,
      },
      courses: courses.map((course) => ({
        id: course.id,
        courseName: course.courseName,
        shortDescription: course.shortDescription,
        price: course.price,
        coverImg: course.coverImg,
        isActive: course.isActive,
        teacherStatus: course.teacherStatus,
        enrolledStudentsCount:
          course.teacherStatus === 'accepted'
            ? (enrollmentCountByCourse.get(course.id) ?? 0)
            : 0,
        createdAt: course.createdAt,
        courseCategory: course.courseCategory
          ? {
              id: course.courseCategory.id,
              name: course.courseCategory.name ?? undefined,
            }
          : null,
      })),
    };
  }

  async updateTeacher(
    teacherId: number,
    editTeacherDto: EditTeacherDto,
    adminId: number,
  ): Promise<Users> {
    const teacher = await this.findTeacherEntity(teacherId);

    // Check if email is being changed and if it already exists
    if (editTeacherDto.email && editTeacherDto.email !== teacher.email) {
      const existingTeacher = await this.usersRepository.findOne({
        where: { email: editTeacherDto.email },
      });

      if (existingTeacher) {
        throw new ConflictException('Email already exists');
      }
      teacher.email = editTeacherDto.email;
    }

    if (editTeacherDto.firstName) {
      teacher.firstName = editTeacherDto.firstName;
    }

    if (editTeacherDto.lastName) {
      teacher.lastName = editTeacherDto.lastName;
    }

    if (editTeacherDto.password) {
      teacher.hashedPassword = await bcrypt.hash(editTeacherDto.password, 10);
    }

    if (editTeacherDto.contactNumber !== undefined) {
      teacher.contactNumber = editTeacherDto.contactNumber;
    }

    if (editTeacherDto.isActive !== undefined) {
      teacher.isActive = editTeacherDto.isActive;
    }

    teacher.updatedAt = new Date();
    teacher.updatedBy = adminId as any;

    return this.usersRepository.save(teacher);
  }

  async deleteTeacher(
    teacherId: number,
    adminId: number,
  ): Promise<{ message: string }> {
    const teacher = await this.findTeacherEntity(teacherId);

    teacher.isDelete = true;
    teacher.deletedAt = new Date();
    teacher.deletedBy = adminId as any;

    await this.usersRepository.save(teacher);

    return {
      message: `Teacher ${teacher.firstName} ${teacher.lastName} deleted successfully`,
    };
  }
}
