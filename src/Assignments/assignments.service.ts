import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeepPartial } from 'typeorm';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { AssignmentSubmissionStatus } from './dto/assignment-status.enum';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getAssignments(
    userId: number,
    roleId: number,
    page: number,
    limit: number,
    courseId?: number,
    status?: AssignmentSubmissionStatus,
  ) {
    const query = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .leftJoinAndSelect('assignment.createdBy', 'createdBy')
      .select([
        'assignment.id',
        'assignment.title',
        'assignment.objective',
        'assignment.deliverable',
        'assignment.format',
        'assignment.totalMarks',
        'assignment.dueDate',
        'assignment.fileUrl',
        'assignment.createdAt',
        'course.id',
        'course.courseName',
        'createdBy.id',
        'createdBy.firstName',
        'createdBy.lastName',
      ]);

    // Role-based filtering
    if (roleId === 3) {
      // Student: Only see assignments for courses they're enrolled in
      query
        .innerJoin(Enrollment, 'enrollment', 'enrollment.courseId = assignment.course.id')
        .where('enrollment.studentId = :userId', { userId });

      // If status filter is provided, filter by student's own submission status
      if (status) {
        query
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id AND submission.student.id = :userId',
            { userId },
          )
          .andWhere('submission.status = :status', { status });
      }
    } else if (roleId === 2) {
      // Teacher: See assignments they created OR assignments for courses they teach
      query
        .leftJoin('course.teacher', 'teacher')
        .where('(assignment.createdBy.id = :userId OR teacher.id = :userId)', {
          userId,
        });

      // If status filter is provided, filter by any assignment_submission status
      if (status) {
        query
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id',
          )
          .andWhere('submission.status = :status', { status });
      }
    } else if (roleId === 1) {
      // Admin: See all assignments
      if (status) {
        query
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id',
          )
          .andWhere('submission.status = :status', { status });
      }
    } else {
      throw new ForbiddenException('Invalid role');
    }

    // Filter by course if provided
    if (courseId) {
      query.andWhere('course.id = :courseId', { courseId });
    }

    // Pagination
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('assignment.createdAt', 'DESC');

    const assignments = await query.getMany();

    // Get total count for pagination
    const countQuery = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin('assignment.course', 'course');

    if (roleId === 3) {
      countQuery
        .innerJoin(Enrollment, 'enrollment', 'enrollment.courseId = assignment.course.id')
        .where('enrollment.studentId = :userId', { userId });

      if (status) {
        countQuery
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id AND submission.student.id = :userId',
            { userId },
          )
          .andWhere('submission.status = :status', { status });
      }
    } else if (roleId === 2) {
      countQuery
        .leftJoin('course.teacher', 'teacher')
        .where('(assignment.createdBy.id = :userId OR teacher.id = :userId)', {
          userId,
        });

      if (status) {
        countQuery
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id',
          )
          .andWhere('submission.status = :status', { status });
      }
    } else if (roleId === 1) {
      if (status) {
        countQuery
          .innerJoin(
            AssignmentSubmission,
            'submission',
            'submission.assignment.id = assignment.id',
          )
          .andWhere('submission.status = :status', { status });
      }
    }

    if (courseId) {
      countQuery.andWhere('course.id = :courseId', { courseId });
    }

    const total = await countQuery.getCount();

    return {
      data: assignments,
      meta: {
        totalItems: total,
        itemCount: assignments.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async createAssignment(
    createDto: CreateAssignmentDto,
    userId: number,
    roleId: number,
  ) {
    // Check if user is admin or teacher
    if (roleId !== 1 && roleId !== 2) {
      throw new ForbiddenException('Only admins and teachers can create assignments');
    }

    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: createDto.courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If user is teacher, verify they are teaching this course
    if (roleId === 2) {
      if (!course.teacher || course.teacher.id !== userId) {
        throw new ForbiddenException(
          'You can only create assignments for courses you are teaching',
        );
      }
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      title: createDto.title,
      objective: createDto.objective || null,
      deliverable: createDto.deliverable || null,
      format: createDto.format || null,
      totalMarks: createDto.totalMarks || null,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      fileUrl: createDto.fileUrl || null,
      course: course,
      createdBy: userId as any,
      createdAt: new Date(),
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    // Get all enrolled students for this course
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: createDto.courseId },
      relations: ['student'],
    });

    // Create assignment_submission records for all enrolled students
    // Note: gradedBy is omitted as it will be set when assignment is graded
    // The database column is nullable but entity doesn't reflect it
    const submissionRecords: AssignmentSubmission[] = [];
    
    for (const enrollment of enrollments) {
      // Using DeepPartial to allow omitting gradedBy (nullable in DB but not in entity)
      const partial: DeepPartial<AssignmentSubmission> = {
        assignment: savedAssignment,
        student: enrollment.student,
        status: AssignmentSubmissionStatus.MISSING,
        submittedAt: null,
        marksObtained: null,
        submissionFile: null,
        comments: null,
      };
      const submission = this.assignmentSubmissionRepository.create(partial);
      submissionRecords.push(submission);
    }

    if (submissionRecords.length > 0) {
      await this.assignmentSubmissionRepository.save(submissionRecords);
    }

    // Return assignment with relations
    const assignmentWithRelations = await this.assignmentRepository.findOne({
      where: { id: savedAssignment.id },
      relations: ['course', 'createdBy'],
    });

    return assignmentWithRelations;
  }

  async getEnrolledStudentsForCourse(courseId: number): Promise<Users[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['student'],
    });

    return enrollments.map((enrollment) => enrollment.student);
  }

  async validateTeacherCanCreateAssignment(
    courseId: number,
    teacherId: number,
  ): Promise<boolean> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course.teacher?.id === teacherId;
  }
}

