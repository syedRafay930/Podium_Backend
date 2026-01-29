import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
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
import {
  AssignmentDetailResponseDto,
  AssignmentMaterialDto,
} from './dto/assignment-detail-response.dto';
import {
  AssignmentResponseDto,
  AssignmentMaterialBasicDto,
} from './dto/assignment-response.dto';
import {
  validateFiles,
  sanitizeFilename,
  parseSubmissionFiles,
} from './utils/file-validator.util';
import { uploadDocumentToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import {
  PaginatedSubmissionsResponseDto,
  StudentSubmissionDto,
} from './dto/assignment-submissions-response.dto';
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

    if (roleId === 3) {
      query
        .innerJoin(
          Enrollment,
          'enrollment',
          'enrollment.courseId = assignment.course.id',
        )
        .where('enrollment.studentId = :userId', { userId });

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
      query
        .leftJoin('course.teacher', 'teacher')
        .where('(assignment.createdBy.id = :userId OR teacher.id = :userId)', {
          userId,
        });

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

    if (courseId) {
      query.andWhere('course.id = :courseId', { courseId });
    }

    query.skip((page - 1) * limit).take(limit);
    query.orderBy('assignment.createdAt', 'DESC');

    const assignments = await query.getMany();

    const countQuery = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin('assignment.course', 'course');

    if (roleId === 3) {
      countQuery
        .innerJoin(
          Enrollment,
          'enrollment',
          'enrollment.courseId = assignment.course.id',
        )
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

    const assignmentDtos: AssignmentResponseDto[] = assignments.map(
      (assignment) => {
        const materials: AssignmentMaterialBasicDto[] =
          assignment.assignmentMaterials?.map((material) => ({
            id: material.id,
            fileUrl: material.fileUrl,
            fileName: material.fileName,
            fileSize: material.fileSize,
            fileType: material.fileType,
          })) || [];

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
      },
    );

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
    if (roleId !== 1 && roleId !== 2) {
      throw new ForbiddenException(
        'Only admins and teachers can create assignments',
      );
    }

    const course = await this.courseRepository.findOne({
      where: { id: createDto.courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (roleId === 2) {
      if (!course.teacher || course.teacher.id !== userId) {
        throw new ForbiddenException(
          'You can only create assignments for courses you are teaching',
        );
      }
    }

    if (files && files.length > 0) {
      validateFiles(files);
    }

    const assignment = this.assignmentRepository.create({
      title: createDto.title,
      objective: createDto.objective || null,
      deliverable: createDto.deliverable || null,
      format: createDto.format || null,
      totalMarks: createDto.totalMarks || null,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      course: course,
      createdBy: userId as any,
      sectionId: createDto.sectionId || null,
      createdAt: new Date(),
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    if (files && files.length > 0) {
      const materialPromises = files.map(async (file) => {
        const uploadResult = await uploadDocumentToCloudinary(file);

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

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: createDto.courseId },
      relations: ['student'],
    });

    if (enrollments.length > 0) {
      const submissionPromises = enrollments.map((enrollment) => {
        const submission = this.assignmentSubmissionRepository.create({
          assignment: savedAssignment,
          student: enrollment.student,
          status: AssignmentSubmissionStatus.MISSING,
          submittedAt: null,
          marksObtained: null,
          submissionFile: null,
          comments: null,
        });
        return this.assignmentSubmissionRepository.save(submission);
      });

      await Promise.all(submissionPromises);
    }

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
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: [
        'course',
        'createdBy',
        'course.teacher',
        'assignmentMaterials',
      ],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (roleId === 3) {
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
      const isCreator = assignment.createdBy.id === userId;
      const isTeacher = assignment.course.teacher?.id === userId;

      if (!isCreator && !isTeacher) {
        throw new ForbiddenException(
          'You do not have permission to view this assignment',
        );
      }
    } else if (roleId !== 1) {
      throw new ForbiddenException('Invalid role');
    }

    const materials: AssignmentMaterialDto[] =
      assignment.assignmentMaterials?.map((material) => ({
        id: material.id,
        fileUrl: material.fileUrl,
        fileName: material.fileName,
        fileSize: material.fileSize,
        fileType: material.fileType,
      })) || [];

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
    if (roleId !== 3) {
      throw new ForbiddenException('Only students can submit assignments');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    validateFiles(files);

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

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

    const fileUploadPromises = files.map(async (file) => {
      try {
        const uploadResult = await uploadDocumentToCloudinary(file);
        return uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload file: ${file.originalname}`,
        );
      }
    });

    const fileUrls = await Promise.all(fileUploadPromises);

    const submissionFileValue = JSON.stringify(fileUrls);

    const now = new Date();
    const isLate =
      assignment.dueDate && new Date(assignment.dueDate) < now ? true : false;

    const submissionStatus = isLate
      ? AssignmentSubmissionStatus.LATE
      : AssignmentSubmissionStatus.SUBMITTED;

    submission.submissionFile = submissionFileValue;
    submission.submittedAt = now;
    submission.status = submissionStatus;

    const updatedSubmission =
      await this.assignmentSubmissionRepository.save(submission);

    const submissionFiles = parseSubmissionFiles(
      updatedSubmission.submissionFile,
    );

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

  async getAssignmentSubmissions(
    assignmentId: number,
    userId: number,
    roleId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedSubmissionsResponseDto> {
    if (roleId !== 2) {
      throw new ForbiddenException(
        'Only teachers can view assignment submissions',
      );
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const isCreator = assignment.createdBy.id === userId;
    const isTeacher = assignment.course.teacher?.id === userId;

    if (!isCreator && !isTeacher) {
      throw new ForbiddenException(
        'You do not have permission to view submissions for this assignment',
      );
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: assignment.course.id },
      relations: ['student'],
    });

    const submissions = await this.assignmentSubmissionRepository.find({
      where: { assignment: { id: assignmentId } },
      relations: ['student'],
    });

    const submissionMap = new Map<number, AssignmentSubmission>();
    submissions.forEach((submission) => {
      submissionMap.set(submission.student.id, submission);
    });

    const studentSubmissions: StudentSubmissionDto[] = enrollments.map(
      (enrollment) => {
        const submission = submissionMap.get(enrollment.student.id);
        const submissionFiles = parseSubmissionFiles(
          submission?.submissionFile || null,
        );

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

    studentSubmissions.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

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
    if (roleId !== 2) {
      throw new ForbiddenException(
        'Only teachers can grade assignment submissions',
      );
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'createdBy', 'course.teacher'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const isCreator = assignment.createdBy.id === userId;
    const isTeacher = assignment.course.teacher?.id === userId;

    if (!isCreator && !isTeacher) {
      throw new ForbiddenException(
        'You do not have permission to grade submissions for this assignment',
      );
    }

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

    if (
      gradeDto.marksObtained !== undefined &&
      gradeDto.marksObtained !== null
    ) {
      if (gradeDto.marksObtained < 0) {
        throw new BadRequestException('Marks obtained cannot be negative');
      }

      if (
        assignment.totalMarks !== null &&
        assignment.totalMarks !== undefined
      ) {
        if (gradeDto.marksObtained > assignment.totalMarks) {
          throw new BadRequestException(
            `Marks obtained (${gradeDto.marksObtained}) cannot exceed total marks (${assignment.totalMarks})`,
          );
        }
      }
    }

    const teacher = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (gradeDto.marksObtained !== undefined) {
      submission.marksObtained = gradeDto.marksObtained;
      submission.status = AssignmentSubmissionStatus.GRADED;
    }

    if (gradeDto.comments !== undefined) {
      submission.comments = gradeDto.comments;
    }

    submission.gradedBy = teacher;

    const updatedSubmission =
      await this.assignmentSubmissionRepository.save(submission);

    const submissionFiles = parseSubmissionFiles(
      updatedSubmission.submissionFile,
    );

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

  async DeleteAssignment(assignmentId: number) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} not found`,
      );
    }

    try {
      await this.assignmentRepository.delete(assignmentId);

      return {
        success: true,
        message: `Assignment ID ${assignmentId} and all its related submissions have been permanently deleted.`,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Could not delete assignment: ' + error.message,
      );
    }
  }
}
