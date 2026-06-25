import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Transactions } from 'src/Entities/entities/Transactions';
import { MailService } from 'src/Nodemailer/mailer.service';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { EnrollmentAction } from './dto/update-enrollment-status.dto';
import { S3Helper } from 'src/S3/s3.helper';

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
    private readonly mailService: MailService,
    private readonly s3Helper: S3Helper,
  ) {}


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

    // Map the results to include avgRating with each course and exclude sensitive fields
    return enrollments.entities.map((enrollment, index) => {
      let teacherWithoutPassword: any = null;
      if (enrollment.course.teacher) {
        const { hashedPassword, ...rest } = enrollment.course.teacher;
        teacherWithoutPassword = rest;
      }
      return {
        ...enrollment,
        course: {
          ...enrollment.course,
          teacher: teacherWithoutPassword,
          avgRating: enrollments.raw[index]?.course_avgRating || 0,
        },
      };
    });
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      relations: ['student', 'course', 'enrolledBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async studentsInCourse(courseId: number): Promise<Enrollment[]> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['student', 'enrolledBy'],
      order: { createdAt: 'DESC' },
    });
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

    // Check existing active enrollment
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId, isActive: true },
    });
    if (existing)
      throw new ConflictException('Student is already enrolled in this course');

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
    let screenshotKey: string | null = null;
    if (screenshot) {
      const uploaded = await this.s3Helper.uploadFile(
        screenshot,
        'enrollments/screenshots',
      );
      screenshotUrl = uploaded.url;
      screenshotKey = uploaded.key;
    }

    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      enrolledBy: studentId as any,
      lectureViewed: 0,
      status: isFree ? 'enrolled' : 'pending',
      isActive: true,
      createdAt: new Date(),
    });
    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    const transaction = this.transactionRepository.create({
      uuid: `txn_${Date.now().toString(36)}`,
      enrollId: savedEnrollment.id,
      amount: course.price || '0',
      status: isFree ? 'free' : 'pending',
      paymentType: isFree ? null : 'online',
      screenshotUrl,
      createdAt: new Date(),
    });
    await this.transactionRepository.save(transaction);

    // Email — free course direct confirmation, paid course "pending review"
    try {
      const enrollmentDate = new Date().toLocaleDateString('en-US', {
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
    if (enrollment.status !== 'pending') {
      throw new BadRequestException('Only pending enrollments can be reviewed');
    }

    const updatedAt = new Date();

    if (dto.action === EnrollmentAction.APPROVE) {
      enrollment.status = 'enrolled';
      enrollment.updatedAt = updatedAt;
      await this.enrollmentRepository.save(enrollment);

      // Update transaction status
      await this.transactionRepository.update(
        { enrollId: enrollmentId },
        { status: 'paid', updatedAt },
      );

      // Approval email
      try {
        await this.mailService.sendTemplatedMail(
          enrollment.student.email,
          'Enrollment Approved - Podium',
          'enrollment-approved',
          {
            studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
            courseName: enrollment.course.courseName,
          },
        );
      } catch (error) {
        console.error('Failed to send approval email:', error);
      }
    } else if (dto.action === EnrollmentAction.REJECT) {
      enrollment.status = 'rejected';
      enrollment.isActive = false;
      enrollment.rejectionReason = dto.rejectionReason || null;
      enrollment.updatedAt = updatedAt;
      await this.enrollmentRepository.save(enrollment);

      // Delete screenshot from S3 if exists
      if (enrollment.transactions?.screenshotUrl) {
        try {
          // Extract key from URL
          const urlParts =
            enrollment.transactions.screenshotUrl.split('.amazonaws.com/');
          if (urlParts[1]) {
            await this.s3Helper.deleteFile(urlParts[1]);
          }
        } catch (error) {
          console.error('Failed to delete screenshot from S3:', error);
        }
      }

      // Rejection email
      try {
        await this.mailService.sendTemplatedMail(
          enrollment.student.email,
          'Enrollment Request Rejected - Podium',
          'enrollment-rejected',
          {
            studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
            courseName: enrollment.course.courseName,
            rejectionReason: dto.rejectionReason || 'No reason provided',
          },
        );
      } catch (error) {
        console.error('Failed to send rejection email:', error);
      }
    }

    return enrollment;
  }
}
