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
import { AssignmentMaterial } from 'src/Entities/entities/AssignmentMaterial';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { AssignmentSubmissionStatus } from './dto/assignment-status.enum';
import { AssignmentDetailResponseDto, AssignmentMaterialDto } from './dto/assignment-detail-response.dto';
import { AssignmentResponseDto, AssignmentMaterialBasicDto } from './dto/assignment-response.dto';
import { validateFiles, sanitizeFilename, parseSubmissionFiles } from './utils/file-validator.util';
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
    @InjectRepository(AssignmentMaterial)
    private readonly assignmentMaterialRepository: Repository<AssignmentMaterial>,
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
      .leftJoinAndSelect('assignment.assignmentMaterials', 'materials')
      .select([
        'assignment.id',
        'assignment.title',
        'assignment.objective',
        'assignment.deliverable',
        'assignment.format',
        'assignment.totalMarks',
        'assignment.dueDate',
        'assignment.createdAt',
        'course.id',
        'course.courseName',
        'createdBy.id',
        'createdBy.firstName',
        'createdBy.lastName',
        'materials.id',
        'materials.fileUrl',
        'materials.fileName',
        'materials.fileSize',
        'materials.fileType',
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

    // Map assignments to DTOs with materials
    const assignmentDtos: AssignmentResponseDto[] = assignments.map((assignment) => {
      const materials: AssignmentMaterialBasicDto[] = assignment.assignmentMaterials?.map(
        (material) => ({
          id: material.id,
          fileUrl: material.fileUrl,
          fileName: material.fileName,
          fileSize: material.fileSize,
          fileType: material.fileType,
        }),
      ) || [];

      return {
        id: assignment.id,
        title: assignment.title,
        objective: assignment.objective,
        deliverable: assignment.deliverable,
        format: assignment.format,
        totalMarks: assignment.totalMarks,
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        materials: materials,
        course: {
          id: assignment.course.id,
          courseName: assignment.course.courseName,
        },
        createdBy: {
          id: assignment.createdBy.id,
          firstName: assignment.createdBy.firstName,
          lastName: assignment.createdBy.lastName,
        },
      };
    });

    return {
      data: assignmentDtos,
      meta: {
        totalItems: total,
        itemCount: assignmentDtos.length,
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
    files?: Express.Multer.File[],
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

    // Validate files if provided
    if (files && files.length > 0) {
      validateFiles(files);
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      title: createDto.title,
      objective: createDto.objective || null,
      deliverable: createDto.deliverable || null,
      format: createDto.format || null,
      totalMarks: createDto.totalMarks || null,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      course: course,
      createdBy: userId as any,
      createdAt: new Date(),
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    // Upload files and create AssignmentMaterial records
    if (files && files.length > 0) {
      const materialPromises = files.map(async (file) => {
        // Upload file to Cloudinary
        const uploadResult = await uploadDocumentToCloudinary(file);
        
        // Create AssignmentMaterial record
        const material = this.assignmentMaterialRepository.create({
          assignmentId: savedAssignment.id,
          fileUrl: uploadResult.secure_url,
          fileName: sanitizeFilename(file.originalname),
          fileSize: file.size,
          fileType: file.mimetype,
          createdAt: new Date(),
        });

        return this.assignmentMaterialRepository.save(material);
      });

      await Promise.all(materialPromises);
    }

    // Get all enrolled students for this course
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: createDto.courseId },
      relations: ['student'],
    });

    // Create assignment_submission records for all enrolled students using bulk insert
    if (enrollments.length > 0) {
      const submissionData = enrollments.map(enrollment => ({
        assignment_id: savedAssignment.id,
        student_id: enrollment.student.id,
        status: AssignmentSubmissionStatus.MISSING,
        submitted_at: null,
        marks_obtained: null,
        submission_file: null,
        comments: null,
      }));

      await this.assignmentSubmissionRepository.insert(submissionData);
    }

    // Return assignment with relations
    const assignmentWithRelations = await this.assignmentRepository.findOne({
      where: { id: savedAssignment.id },
      relations: ['course', 'createdBy', 'assignmentMaterials'],
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
      relations: ['course', 'createdBy', 'course.teacher', 'assignmentMaterials'],
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

    // Map materials to DTO
    const materials: AssignmentMaterialDto[] = assignment.assignmentMaterials?.map(
      (material) => ({
        id: material.id,
        fileUrl: material.fileUrl,
        fileName: material.fileName,
        fileSize: material.fileSize,
        fileType: material.fileType,
      }),
    ) || [];

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
      createdAt: assignment.createdAt,
      materials: materials,
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
    files: Express.Multer.File[],
  ): Promise<SubmissionResponseDto> {
    // Only students can upload submissions
    if (roleId !== 3) {
      throw new ForbiddenException('Only students can submit assignments');
    }

    // Validate files
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    // Validate all files
    validateFiles(files);

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

    // Upload all files to Cloudinary
    const fileUploadPromises = files.map(async (file) => {
      try {
        const uploadResult = await uploadDocumentToCloudinary(file);
        return uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException(`Failed to upload file: ${file.originalname}`);
      }
    });

    const fileUrls = await Promise.all(fileUploadPromises);

    // Always store file URLs as JSON array string for consistency
    const submissionFileValue = JSON.stringify(fileUrls);

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
    submission.submissionFile = submissionFileValue;
    submission.submittedAt = now;
    submission.status = submissionStatus;

    const updatedSubmission = await this.assignmentSubmissionRepository.save(
      submission,
    );

    // Parse submission files using helper function
    const submissionFiles = parseSubmissionFiles(updatedSubmission.submissionFile);

    // Return response DTO
    const response: SubmissionResponseDto = {
      id: updatedSubmission.id,
      submissionFiles: submissionFiles,
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
    materialId: number,
    userId: number,
    roleId: number,
  ): Promise<{ fileUrl: string; filename: string }> {
    // Fetch assignment with all relations
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher', 'assignmentMaterials'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Find the specific material
    const material = assignment.assignmentMaterials?.find(
      (m) => m.id === materialId,
    );

    if (!material) {
      throw new NotFoundException('Assignment material not found');
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

    // Extract filename from material or use a default
    const filename = material.fileName || 'assignment.pdf';

    return {
      fileUrl: material.fileUrl,
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
        const submissionFiles = parseSubmissionFiles(submission?.submissionFile || null);
        
        return {
          studentId: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
          submittedAt: submission?.submittedAt || null,
          submissionFiles: submissionFiles,
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

    // Parse submission files
    const submissionFiles = parseSubmissionFiles(updatedSubmission.submissionFile);

    // Return response DTO
    const response: SubmissionResponseDto = {
      id: updatedSubmission.id,
      submissionFiles: submissionFiles,
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

