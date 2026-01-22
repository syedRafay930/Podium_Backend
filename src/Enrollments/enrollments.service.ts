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

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async enrollStudent(
    courseId: number,
    studentId: number,
    enrolledByUserId: number,
    enrolledByRoleId: number,
    paymentStatus?: 'pending' | 'paid',
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
      throw new BadRequestException('User must have student role to be enrolled');
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

    // Determine payment status based on priority:
    // 1. If course price is 0 or null -> 'free'
    // 2. If admin enrollment -> use provided paymentStatus or default to 'paid'
    // 3. If student self-enrollment -> 'pending'

    let finalPaymentStatus: string;

    // Check if course is free (price is 0 or null)
    const coursePrice = course.price ? parseFloat(course.price) : 0;
    if (coursePrice === 0 || course.price === null) {
      finalPaymentStatus = 'free';
    } else {
      // Course has a price
      if (enrolledByRoleId === 1) {
        // Admin enrollment
        if (paymentStatus) {
          // Validate paymentStatus if provided
          if (paymentStatus !== 'pending' && paymentStatus !== 'paid') {
            throw new BadRequestException(
              'paymentStatus must be either "pending" or "paid"',
            );
          }
          finalPaymentStatus = paymentStatus;
        } else {
          // Default to 'paid' for admin enrollment
          finalPaymentStatus = 'paid';
        }
      } else if (enrolledByRoleId === 3) {
        // Student self-enrollment
        finalPaymentStatus = 'pending';
      } else {
        throw new BadRequestException('Invalid role for enrollment');
      }
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      enrolledBy: enrolledByUserId as any,
      paymentStatus: finalPaymentStatus,
      lectureViewed: 0,
      createdAt: new Date(),
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async myEnrolledCourses(studentId: number): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId },
      relations: ['course', 'course.courseCategory', 'course.teacher'],
      order: { createdAt: 'DESC' },
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
}

