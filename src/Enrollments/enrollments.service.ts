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
  ) {}

  async enrollStudent(
    courseId: number,
    studentId: number,
    enrolledByUserId: number,
    role_id: number,
    status: 'pending' | 'enrolled',
  ): Promise<Enrollment> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify student exists and has student role
    const student = await this.usersRepository.findOne({
      where: { id: studentId },
      relations: ['role'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.role.id !== 3) {
      throw new BadRequestException(
        'User must have student role to be enrolled',
      );
    }

    // Check for duplicate enrollment
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      enrolledBy: enrolledByUserId as any,
      lectureViewed: 0,
      createdAt: new Date(),
      status,
    });
    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    let finalPaymentStatus: string;

    // Check if course is free (price is 0 or null)
    const coursePrice = course.price ? parseFloat(course.price) : 0;
    if (coursePrice === 0 || course.price === null) {
      finalPaymentStatus = 'free';
    } else {
      // Course has a price
      if (role_id === 1) {
        // Admin enrollment
        finalPaymentStatus = 'paid';
      } else {
        // Default to 'paid' for admin enrollment
        finalPaymentStatus = 'pending';
      }
    }
    const transaction = this.transactionRepository.create({
      uuid: `txn_${Date.now().toString(36)}`,
      enrollId: savedEnrollment.id,
      amount: course.price || '0',
      status: finalPaymentStatus,
      paymentType: 'cash',
      createdAt: new Date(),
    });
    await this.transactionRepository.save(transaction);

    // Send enrollment email notification
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
      // Don't throw error - enrollment should succeed even if email fails
    }

    return savedEnrollment;
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
      .orderBy('enrollment.createdAt', 'DESC')
      .getRawAndEntities();

    // Map the results to include avgRating with each course
    return enrollments.entities.map((enrollment, index) => ({
      ...enrollment,
      course: {
        ...enrollment.course,
        avgRating: enrollments.raw[index]?.course_avgRating || 0,
      },
    }));
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
}
