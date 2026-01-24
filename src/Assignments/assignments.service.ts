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
import { AssignmentDetailResponseDto } from './dto/assignment-detail-response.dto';
import { validateSubmissionFile, sanitizeFilename } from './utils/file-validator.util';
import { uploadDocumentToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { PaginatedSubmissionsResponseDto, StudentSubmissionDto } from './dto/assignment-submissions-response.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

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

  async getAssignmentById(
    assignmentId: number,
    userId: number,
    roleId: number,
  ): Promise<AssignmentDetailResponseDto> {
    // Fetch assignment with all relations
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Role-based access control
    if (roleId === 3) {
      // Student: Only if enrolled in the course
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          studentId: userId,
          courseId: assignment.course.id,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'You do not have permission to view this assignment',
        );
      }
    } else if (roleId === 2) {
      // Teacher: If they created it OR teach the course
      const isCreator = assignment.createdBy.id === userId;
      const isTeacher = assignment.course.teacher?.id === userId;

      if (!isCreator && !isTeacher) {
        throw new ForbiddenException(
          'You do not have permission to view this assignment',
        );
      }
    } else if (roleId !== 1) {
      // Admin (roleId === 1) has full access, but any other role is invalid
      throw new ForbiddenException('Invalid role');
    }

    // Transform to DTO
    const response: AssignmentDetailResponseDto = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      objective: assignment.objective,
      deliverable: assignment.deliverable,
      format: assignment.format,
      totalMarks: assignment.totalMarks,
      dueDate: assignment.dueDate,
      fileUrl: assignment.fileUrl,
      createdAt: assignment.createdAt,
      course: {
        id: assignment.course.id,
        courseName: assignment.course.courseName,
        shortDescription: assignment.course.shortDescription,
        longDescription: assignment.course.longDescription,
        coverImg: assignment.course.coverImg,
        price: assignment.course.price,
        createdAt: assignment.course.createdAt,
      },
      createdBy: {
        id: assignment.createdBy.id,
        firstName: assignment.createdBy.firstName,
        lastName: assignment.createdBy.lastName,
        email: assignment.createdBy.email,
      },
    };

    return response;
  }

  async uploadSubmission(
    assignmentId: number,
    userId: number,
    roleId: number,
    file: Express.Multer.File,
  ): Promise<SubmissionResponseDto> {
    // Only students can upload submissions
    if (roleId !== 3) {
      throw new ForbiddenException('Only students can submit assignments');
    }

    // Validate file
    validateSubmissionFile(file);

    // Fetch assignment with course relation
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify student is enrolled in the course
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId: userId,
        courseId: assignment.course.id,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in the course containing this assignment',
      );
    }

    // Find or verify submission record exists
    let submission = await this.assignmentSubmissionRepository.findOne({
      where: {
        assignment: { id: assignmentId },
        student: { id: userId },
      },
      relations: ['assignment', 'student'],
    });

    if (!submission) {
      throw new NotFoundException(
        'Submission record not found. Please contact your instructor.',
      );
    }

    // Upload file to Cloudinary
    let fileUrl: string;
    try {
      const uploadResult = await uploadDocumentToCloudinary(file);
      fileUrl = uploadResult.secure_url;
    } catch (error) {
      throw new BadRequestException('Failed to upload file. Please try again.');
    }

    // Determine submission status (check if late)
    const now = new Date();
    const isLate =
      assignment.dueDate && new Date(assignment.dueDate) < now
        ? true
        : false;

    const submissionStatus = isLate
      ? AssignmentSubmissionStatus.LATE
      : AssignmentSubmissionStatus.SUBMITTED;

    // Update submission record
    submission.submissionFile = fileUrl;
    submission.submittedAt = now;
    submission.status = submissionStatus;

    const updatedSubmission = await this.assignmentSubmissionRepository.save(
      submission,
    );

    // Return response DTO
    const response: SubmissionResponseDto = {
      id: updatedSubmission.id,
      submissionFile: updatedSubmission.submissionFile,
      status: updatedSubmission.status,
      submittedAt: updatedSubmission.submittedAt,
      marksObtained: updatedSubmission.marksObtained,
      comments: updatedSubmission.comments,
      assignmentId: assignmentId,
      studentId: userId,
    };

    return response;
  }

  async previewAssignmentFile(
    assignmentId: number,
    userId: number,
    roleId: number,
  ): Promise<{ fileUrl: string; filename: string }> {
    // Fetch assignment with all relations
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if assignment has a file
    if (!assignment.fileUrl) {
      throw new NotFoundException('Assignment file not found');
    }

    // Role-based access control (same logic as getAssignmentById)
    if (roleId === 3) {
      // Student: Only if enrolled in the course
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          studentId: userId,
          courseId: assignment.course.id,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'You do not have permission to view this assignment file',
        );
      }
    } else if (roleId === 2) {
      // Teacher: If they created it OR teach the course
      const isCreator = assignment.createdBy.id === userId;
      const isTeacher = assignment.course.teacher?.id === userId;

      if (!isCreator && !isTeacher) {
        throw new ForbiddenException(
          'You do not have permission to view this assignment file',
        );
      }
    } else if (roleId !== 1) {
      // Admin (roleId === 1) has full access, but any other role is invalid
      throw new ForbiddenException('Invalid role');
    }

    // Extract filename from URL or use a default
    let filename = 'assignment.pdf';
    try {
      const url = new URL(assignment.fileUrl);
      const pathParts = url.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        filename = lastPart;
      }
    } catch (error) {
      // If URL parsing fails, use default filename
      filename = 'assignment.pdf';
    }

    return {
      fileUrl: assignment.fileUrl,
      filename: filename,
    };
  }

  async getAssignmentSubmissions(
    assignmentId: number,
    userId: number,
    roleId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedSubmissionsResponseDto> {
    // Only teachers can access this endpoint
    if (roleId !== 2) {
      throw new ForbiddenException('Only teachers can view assignment submissions');
    }

    // Fetch assignment with course and teacher relations
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify teacher permission: created assignment OR teaches the course
    const isCreator = assignment.createdBy.id === userId;
    const isTeacher = assignment.course.teacher?.id === userId;

    if (!isCreator && !isTeacher) {
      throw new ForbiddenException(
        'You do not have permission to view submissions for this assignment',
      );
    }

    // Get all enrollments for the course with student relations
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: assignment.course.id },
      relations: ['student'],
    });

    // Get all submissions for this assignment
    const submissions = await this.assignmentSubmissionRepository.find({
      where: { assignment: { id: assignmentId } },
      relations: ['student'],
    });

    // Create a map of studentId -> submission for quick lookup
    const submissionMap = new Map<number, AssignmentSubmission>();
    submissions.forEach((submission) => {
      submissionMap.set(submission.student.id, submission);
    });

    // Combine enrollments with submissions
    const studentSubmissions: StudentSubmissionDto[] = enrollments.map(
      (enrollment) => {
        const submission = submissionMap.get(enrollment.student.id);
        return {
          studentId: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
          submittedAt: submission?.submittedAt || null,
          submissionFile: submission?.submissionFile || null,
          status: submission?.status || AssignmentSubmissionStatus.MISSING,
        };
      },
    );

    // Sort by student name (lastName, then firstName)
    studentSubmissions.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

    // Apply pagination
    const totalItems = studentSubmissions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = studentSubmissions.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      meta: {
        totalItems: totalItems,
        itemCount: paginatedData.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async gradeSubmission(
    assignmentId: number,
    studentId: number,
    gradeDto: GradeSubmissionDto,
    userId: number,
    roleId: number,
  ): Promise<SubmissionResponseDto> {
    // Only teachers can grade submissions
    if (roleId !== 2) {
      throw new ForbiddenException('Only teachers can grade assignment submissions');
    }

    // Fetch assignment with course and teacher relations
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify teacher permission: created assignment OR teaches the course
    const isCreator = assignment.createdBy.id === userId;
    const isTeacher = assignment.course.teacher?.id === userId;

    if (!isCreator && !isTeacher) {
      throw new ForbiddenException(
        'You do not have permission to grade submissions for this assignment',
      );
    }

    // Find submission record
    const submission = await this.assignmentSubmissionRepository.findOne({
      where: {
        assignment: { id: assignmentId },
        student: { id: studentId },
      },
      relations: ['assignment', 'student'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Validate marks if provided
    if (gradeDto.marksObtained !== undefined && gradeDto.marksObtained !== null) {
      if (gradeDto.marksObtained < 0) {
        throw new BadRequestException('Marks obtained cannot be negative');
      }

      // Validate against totalMarks if it exists
      if (assignment.totalMarks !== null && assignment.totalMarks !== undefined) {
        if (gradeDto.marksObtained > assignment.totalMarks) {
          throw new BadRequestException(
            `Marks obtained (${gradeDto.marksObtained}) cannot exceed total marks (${assignment.totalMarks})`,
          );
        }
      }
    }

    // Get teacher user entity for gradedBy
    const teacher = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Update submission fields
    if (gradeDto.marksObtained !== undefined) {
      submission.marksObtained = gradeDto.marksObtained;
      // Auto-set status to GRADED when marks are provided
      submission.status = AssignmentSubmissionStatus.GRADED;
    }

    if (gradeDto.comments !== undefined) {
      submission.comments = gradeDto.comments;
    }

    // Set gradedBy to the current teacher
    submission.gradedBy = teacher;

    // Save updated submission
    const updatedSubmission = await this.assignmentSubmissionRepository.save(
      submission,
    );

    // Return response DTO
    const response: SubmissionResponseDto = {
      id: updatedSubmission.id,
      submissionFile: updatedSubmission.submissionFile,
      status: updatedSubmission.status,
      submittedAt: updatedSubmission.submittedAt,
      marksObtained: updatedSubmission.marksObtained,
      comments: updatedSubmission.comments,
      assignmentId: assignmentId,
      studentId: studentId,
    };

    return response;
  }
}

