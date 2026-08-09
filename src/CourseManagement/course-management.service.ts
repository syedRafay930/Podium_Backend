import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sections } from 'src/Entities/entities/Sections';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { QuizAttempts } from 'src/Entities/entities/QuizAttempts';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateResourceDto } from '../Resources/dto/create-resource.dto';
import { UpdateResourceDto } from '../Resources/dto/update-resource.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { SectionWithContentResponseDto } from './dto/section-with-content-response.dto';
import { ResourceListResponseDto } from 'src/Resources/dto/resource-list-response.dto';
//import { ResourcesService } from 'src/Resources/resources.service';
import { S3Helper } from 'src/S3/s3.helper';
import { ProgressService, ContentCompletionSets } from 'src/Progress/progress.service';

type StudentQuizAttemptInfo = {
  attemptId: number;
  attemptStatus: 'submitted' | 'graded';
  marksObtained: number | null;
  comments: string | null;
  submittedAt: Date | null;
};

type TeacherQuizAttemptStats = {
  attemptCount: number;
  ungradedCount: number;
  gradedCount: number;
};

@Injectable()
export class CourseManagementService {
  constructor(
    @InjectRepository(Sections)
    private readonly sectionRepository: Repository<Sections>,
    @InjectRepository(Resources)
    private readonly resourceRepository: Repository<Resources>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(Lectures)
    private readonly lectureRepository: Repository<Lectures>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Quizzes)
    private readonly quizRepository: Repository<Quizzes>,
    @InjectRepository(QuizAttempts)
    private readonly quizAttemptsRepository: Repository<QuizAttempts>,
    private readonly s3Helper: S3Helper,
    private readonly progressService: ProgressService,
    //private readonly resourcesService: ResourcesService,
  ) {}

  // Validation helpers
  async validateCourseAccess(
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<Courses> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (roleId === 2 && course.teacher?.id !== userId) {
      throw new ForbiddenException('You can only manage courses you teach');
    }

    // if (roleId === 3) {
    //   throw new ForbiddenException('Students cannot manage courses');
    // }

    return course;
  }

  async validateSectionBelongsToCourse(
    sectionId: number,
    courseId: number,
  ): Promise<Sections> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, courseId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException(
        'Section not found or does not belong to this course',
      );
    }

    return section;
  }

  async createSection(
    courseId: number,
    dto: CreateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = this.sectionRepository.create({
      title: dto.title,
      description: dto.description || null,
      courseId,
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedSection = await this.sectionRepository.save(section);
    return this.mapSectionToDto(savedSection);
  }

  async getSectionsByCourse(
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto[]> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    return sections.map((section) => this.mapSectionToDto(section));
  }

  async getSectionByCourseIdWithContent(
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<SectionWithContentResponseDto[]> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    const [studentQuizAttemptByQuizId, teacherQuizStatsByQuizId] =
      await Promise.all([
        roleId === 3
          ? this.getStudentLatestQuizAttemptsByCourse(userId, courseId)
          : Promise.resolve(new Map<number, StudentQuizAttemptInfo>()),
        roleId === 1 || roleId === 2
          ? this.getTeacherQuizAttemptStatsByCourse(courseId)
          : Promise.resolve(new Map<number, TeacherQuizAttemptStats>()),
      ]);

    // For each section, fetch assignments, lectures, and resources
    const sectionsWithContent = await Promise.all(
      sections.map(async (section) => {
        const quizWhereCondition: any = { section_id: section.id, isDelete: false };
        if (roleId === 3) { 
          quizWhereCondition.isPublished = true;
        }
        const [assignments, lectures, resources, quizzes] = await Promise.all([
          this.assignmentRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy', 'assignmentMaterials'],
            order: { createdAt: 'ASC' },
          }),
          this.lectureRepository
            .createQueryBuilder('lecture')
            .where('lecture.section_id = :sectionId', { sectionId: section.id })
            .leftJoinAndSelect('lecture.createdBy', 'createdBy')
            .orderBy('lecture.lectureOrder', 'ASC')
            .addOrderBy('lecture.createdAt', 'ASC')
            .getMany(),
          this.resourceRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy2'],
            order: { createdAt: 'ASC' },
          }),
          this.quizRepository.find({
          where: quizWhereCondition,
          relations: ['createdBy'],
          order: { createdAt: 'ASC' },
        }),
        ]);

        return this.mapSectionWithContentToDto(
          section,
          assignments,
          lectures,
          resources,
          quizzes,
          null,
          null,
          roleId === 3 ? studentQuizAttemptByQuizId : null,
          roleId === 1 || roleId === 2 ? teacherQuizStatsByQuizId : null,
        );
      }),
    );

    return sectionsWithContent;
  }

  async getCourseByIdWithContent(
    courseId: number,
    userId: number,
    roleId: number,
  ) {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    // Fetch course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher', 'courseRatings'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Fetch all sections with their content
    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    // Get sections with content grouped by section
    const completionSets: ContentCompletionSets | null =
      roleId === 3
        ? await this.progressService.getContentCompletionSets(userId, courseId)
        : null;

    // Student submissions for marks/status on assignments
    const submissionByAssignmentId = new Map<number, AssignmentSubmission>();
    if (roleId === 3) {
      const submissions = await this.assignmentSubmissionRepository
        .createQueryBuilder('submission')
        .innerJoinAndSelect('submission.assignment', 'assignment')
        .innerJoin('submission.student', 'student')
        .where('student.id = :userId', { userId })
        .andWhere('assignment.course_id = :courseId', { courseId })
        .getMany();

      for (const submission of submissions) {
        if (submission.assignment?.id) {
          submissionByAssignmentId.set(submission.assignment.id, submission);
        }
      }
    }

    const [studentQuizAttemptByQuizId, teacherQuizStatsByQuizId] =
      await Promise.all([
        roleId === 3
          ? this.getStudentLatestQuizAttemptsByCourse(userId, courseId)
          : Promise.resolve(new Map<number, StudentQuizAttemptInfo>()),
        roleId === 1 || roleId === 2
          ? this.getTeacherQuizAttemptStatsByCourse(courseId)
          : Promise.resolve(new Map<number, TeacherQuizAttemptStats>()),
      ]);

    const sectionsWithContent = await Promise.all(
      sections.map(async (section) => {
        const quizWhereCondition: any = { section_id: section.id, isDelete: false };
        if (roleId === 3) { 
          quizWhereCondition.isPublished = true;
        }
        const [assignments, lectures, resources, quizzes] = await Promise.all([
          this.assignmentRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy', 'assignmentMaterials'],
            order: { createdAt: 'ASC' },
          }),
          this.lectureRepository
            .createQueryBuilder('lecture')
            .where('lecture.section_id = :sectionId', { sectionId: section.id })
            .andWhere('lecture.isDelete = false')
            .leftJoinAndSelect('lecture.createdBy', 'createdBy')
            .orderBy('lecture.lectureOrder', 'ASC')
            .addOrderBy('lecture.createdAt', 'ASC')
            .getMany(),
          this.resourceRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy2'],
            order: { createdAt: 'ASC' },
          }),
          this.quizRepository.find({
          where: quizWhereCondition,
          relations: ['createdBy'],
          order: { createdAt: 'ASC' },
        }),
        ]);

        return this.mapSectionWithContentToDto(
          section,
          assignments,
          lectures,
          resources,
          quizzes,
          completionSets,
          roleId === 3 ? submissionByAssignmentId : null,
          roleId === 3 ? studentQuizAttemptByQuizId : null,
          roleId === 1 || roleId === 2 ? teacherQuizStatsByQuizId : null,
        );
      }),
    );

    const ratingValues = (course.courseRatings ?? [])
      .map((r) => Number(r.rating))
      .filter((n) => !Number.isNaN(n));
    const averageRating = ratingValues.length
      ? Math.round(
          (ratingValues.reduce((sum, n) => sum + n, 0) / ratingValues.length) *
            10,
        ) / 10
      : 0;

    const safeCourse = {
      id: course.id,
      courseName: course.courseName,
      shortDescription: course.shortDescription,
      longDescription: course.longDescription,
      price: course.price,
      coverImg: course.coverImg,
      languages: course.languages,
      isActive: course.isActive,
      teacherStatus: course.teacherStatus,
      totalLectures: course.totalLectures,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      averageRating,
      ratingCount: ratingValues.length,
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
    };

    const contentStats = {
      sectionCount: sectionsWithContent.length,
      lectureCount: sectionsWithContent.reduce(
        (sum, s) => sum + (s.lectures?.length ?? 0),
        0,
      ),
      assignmentCount: sectionsWithContent.reduce(
        (sum, s) => sum + (s.assignments?.length ?? 0),
        0,
      ),
      quizCount: sectionsWithContent.reduce(
        (sum, s) => sum + (s.quizzes?.length ?? 0),
        0,
      ),
      resourceCount: sectionsWithContent.reduce(
        (sum, s) => sum + (s.resources?.length ?? 0),
        0,
      ),
    };

    const baseResponse = {
      course: safeCourse,
      sections: sectionsWithContent,
    };

    // For admin (role_id = 1) and teacher (role_id = 2) - include enrollments
    if (roleId === 1 || roleId === 2) {
      const mapEnrollment = (e: Enrollment) => ({
        id: e.id,
        studentId: e.student?.id,
        studentName: e.student
          ? `${e.student.firstName} ${e.student.lastName}`.trim()
          : null,
        studentEmail: e.student?.email,
        status: e.status,
        isActive: e.isActive,
        rejectionReason: e.rejectionReason,
        rejectedAt: e.rejectedAt,
        enrolledAt: e.createdAt,
        updatedAt: e.updatedAt,
      });

      if (roleId === 1) {
        const allEnrollments = await this.enrollmentRepository.find({
          where: { courseId },
          relations: ['student'],
          order: { createdAt: 'DESC' },
        });

        const enrolled = allEnrollments.filter((e) => e.status === 'enrolled');
        const pending = allEnrollments.filter((e) => e.status === 'pending');
        const rejected = allEnrollments.filter((e) => e.status === 'rejected');

        return {
          ...baseResponse,
          stats: {
            enrolledCount: enrolled.length,
            pendingCount: pending.length,
            rejectedCount: rejected.length,
            totalEnrollments: allEnrollments.length,
            ...contentStats,
          },
          enrollments: enrolled.map(mapEnrollment),
          pendingEnrollments: pending.map(mapEnrollment),
          rejectedEnrollments: rejected.map(mapEnrollment),
          enrollmentCount: enrolled.length,
        };
      }

      const enrollments = await this.enrollmentRepository.find({
        where: { courseId, status: 'enrolled' },
        relations: ['student'],
        order: { createdAt: 'ASC' },
      });

      return {
        ...baseResponse,
        stats: {
          enrolledCount: enrollments.length,
          ...contentStats,
        },
        enrollments: enrollments.map(mapEnrollment),
        enrollmentCount: enrollments.length,
      };
    }

    // For students (role_id = 3) - only return course, sections, assignments, and lectures
    return baseResponse;
  }

  async updateSection(
    sectionId: number,
    courseId: number,
    dto: UpdateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = await this.validateSectionBelongsToCourse(
      sectionId,
      courseId,
    );

    if (dto.title !== undefined) {
      section.title = dto.title;
    }
    if (dto.description !== undefined) {
      section.description = dto.description;
    }

    section.updatedAt = new Date();
    section.updatedBy = userId;

    const updatedSection = await this.sectionRepository.save(section);
    return this.mapSectionToDto(updatedSection);
  }

  async deleteSection(
    sectionId: number,
    courseId: number,
    userId: number,
    roleId: number,
    deleteAssignments: boolean = false,
  ): Promise<{ message: string }> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = await this.validateSectionBelongsToCourse(
      sectionId,
      courseId,
    );

    if (deleteAssignments) {
      const assignments = await this.assignmentRepository.find({
        where: { sectionId },
        relations: ['assignmentMaterials'],
      });

      const materialDeletions: Promise<void>[] = [];
      for (const assignment of assignments) {
        if (assignment.assignmentMaterials && assignment.assignmentMaterials.length > 0) {
          for (const material of assignment.assignmentMaterials) {
            if (material.fileUrl) {
              const key = this.s3Helper.extractKeyFromUrl(material.fileUrl);
              if (key) {
                materialDeletions.push(
                  this.s3Helper.deleteFile(key).catch((error) => {
                    console.error(
                      `Failed to delete assignment material S3 file: ${error}`,
                    );
                  }),
                );
              }
            }
          }
        }
      }

      await Promise.all(materialDeletions);

      // Bulk delete assignments (materials and submissions will be cascade-deleted)
      if (assignments.length > 0) {
        try {
          await this.assignmentRepository.delete({ sectionId });
        } catch (error) {
          console.error(`Failed to delete assignments: ${error}`);
        }
      }
    }

    // Delete the section (resources will be preserved with sectionId set to NULL)
    await this.sectionRepository.remove(section);
    return { message: 'Section deleted successfully' };
  }
  
  // Helper methods

  private mapSectionToDto(section: Sections): SectionResponseDto {
    const dto: SectionResponseDto = {
      id: section.id,
      title: section.title,
      description: section.description,
      courseId: section.courseId,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };

    if (section.createdBy2) {
      dto.createdBy = {
        id: section.createdBy2.id,
        firstName: section.createdBy2.firstName,
        lastName: section.createdBy2.lastName,
      };
    }

    if (section.updatedBy2) {
      dto.updatedBy = {
        id: section.updatedBy2.id,
        firstName: section.updatedBy2.firstName,
        lastName: section.updatedBy2.lastName,
      };
    }

    return dto;
  }

  private mapSectionWithContentToDto(
    section: Sections,
    assignments: Assignment[],
    lectures: Lectures[],
    resources: Resources[],
    quizzes: Quizzes[],
    completionSets: ContentCompletionSets | null = null,
    submissionByAssignmentId: Map<number, AssignmentSubmission> | null = null,
    studentQuizAttemptByQuizId: Map<number, StudentQuizAttemptInfo> | null = null,
    teacherQuizStatsByQuizId: Map<number, TeacherQuizAttemptStats> | null = null,
  ): SectionWithContentResponseDto {
    const dto: SectionWithContentResponseDto = {
      id: section.id,
      title: section.title,
      description: section.description,
      courseId: section.courseId,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      assignments: assignments.map((a) =>
        this.mapAssignmentToDto(a, completionSets, submissionByAssignmentId),
      ),
      lectures: lectures.map((l) => this.mapLectureToDto(l, completionSets)),
      resources: resources.map((r) => this.mapResourceToContentDto(r)),
      quizzes: quizzes.map((q) =>
        this.mapQuizToDto(
          q,
          completionSets,
          studentQuizAttemptByQuizId,
          teacherQuizStatsByQuizId,
        ),
      ),
    };

    if (section.createdBy2) {
      dto.createdBy = {
        id: section.createdBy2.id,
        firstName: section.createdBy2.firstName,
        lastName: section.createdBy2.lastName,
      };
    }

    if (section.updatedBy2) {
      dto.updatedBy = {
        id: section.updatedBy2.id,
        firstName: section.updatedBy2.firstName,
        lastName: section.updatedBy2.lastName,
      };
    }

    return dto;
  }

  private mapAssignmentToDto(
    assignment: Assignment,
    completionSets: ContentCompletionSets | null = null,
    submissionByAssignmentId: Map<number, AssignmentSubmission> | null = null,
  ) {
    const materials = assignment.assignmentMaterials?.map((material) => ({
      id: material.id,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileSize: material.fileSize,
      fileType: material.fileType,
    })) || [];

    const submission = submissionByAssignmentId?.get(assignment.id);
    const status = submissionByAssignmentId
      ? submission?.status || 'missing'
      : undefined;

    return {
      id: assignment.id,
      title: assignment.title,
      objective: assignment.objective,
      deliverable: assignment.deliverable,
      format: assignment.format,
      totalMarks: assignment.totalMarks,
      dueDate: assignment.dueDate,
      description: assignment.description,
      createdAt: assignment.createdAt,
      materials: materials.length > 0 ? materials : undefined,
      createdBy: assignment.createdBy
        ? {
            id: assignment.createdBy.id,
            firstName: assignment.createdBy.firstName,
            lastName: assignment.createdBy.lastName,
          }
        : undefined,
      ...(completionSets
        ? { isCompleted: completionSets.assignmentIds.has(assignment.id) }
        : {}),
      ...(submissionByAssignmentId
        ? {
            status,
            submittedAt: submission?.submittedAt ?? null,
            marksObtained:
              status === 'graded' || submission?.marksObtained != null
                ? submission?.marksObtained ?? null
                : null,
            comments: status === 'graded' ? submission?.comments ?? null : null,
          }
        : {}),
    };
  }

  private mapLectureToDto(
    lecture: Lectures,
    completionSets: ContentCompletionSets | null = null,
  ) {
    return {
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      lectureType: lecture.lectureType,
      videoUrl: lecture.videoUrl,
      duration: lecture.duration,
      liveStart: lecture.liveStart,
      meetingLink: lecture.meetingLink,
      lectureOrder: lecture.lectureOrder,
      createdAt: lecture.createdAt,
      updatedAt: lecture.updatedAt,
      createdBy: lecture.createdBy
        ? {
            id: lecture.createdBy.id,
            firstName: lecture.createdBy.firstName,
            lastName: lecture.createdBy.lastName,
          }
        : undefined,
      ...(completionSets
        ? { isCompleted: completionSets.lectureIds.has(lecture.id) }
        : {}),
    };
  }

  private mapResourceToContentDto(resource: Resources) {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      fileUrl: resource.fileUrl,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      duration: resource.duration,
      isPreview: resource.isPreview,
      isActive: resource.isActive,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      createdBy: resource.createdBy2
        ? {
            id: resource.createdBy2.id,
            firstName: resource.createdBy2.firstName,
            lastName: resource.createdBy2.lastName,
          }
        : undefined,
    };
  }

  private mapQuizToDto(
    quiz: Quizzes,
    completionSets: ContentCompletionSets | null = null,
    studentQuizAttemptByQuizId: Map<number, StudentQuizAttemptInfo> | null = null,
    teacherQuizStatsByQuizId: Map<number, TeacherQuizAttemptStats> | null = null,
  ) {
    const studentAttempt = studentQuizAttemptByQuizId?.get(quiz.id);
    const teacherStats = teacherQuizStatsByQuizId?.get(quiz.id);
    const attemptStatus: 'missing' | 'submitted' | 'graded' =
      studentAttempt?.attemptStatus ?? 'missing';

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      totalMarks: quiz.totalMarks,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      isPublished: quiz.isPublished ?? false,
      createdAt: quiz.createdAt,
      createdBy: quiz.createdBy
        ? {
            id: quiz.createdBy.id,
            firstName: quiz.createdBy.firstName,
            lastName: quiz.createdBy.lastName,
          }
        : undefined,
      ...(completionSets
        ? { isCompleted: completionSets.quizIds.has(quiz.id) }
        : {}),
      ...(studentQuizAttemptByQuizId
        ? {
            attemptId: studentAttempt?.attemptId ?? null,
            attemptStatus,
            marksObtained: studentAttempt?.marksObtained ?? null,
            comments: studentAttempt?.comments ?? null,
            submittedAt: studentAttempt?.submittedAt ?? null,
          }
        : {}),
      ...(teacherQuizStatsByQuizId
        ? {
            attemptCount: teacherStats?.attemptCount ?? 0,
            ungradedCount: teacherStats?.ungradedCount ?? 0,
            gradedCount: teacherStats?.gradedCount ?? 0,
          }
        : {}),
    };
  }

  private async getStudentLatestQuizAttemptsByCourse(
    studentId: number,
    courseId: number,
  ): Promise<Map<number, StudentQuizAttemptInfo>> {
    const attempts = await this.quizAttemptsRepository
      .createQueryBuilder('attempt')
      .innerJoinAndSelect('attempt.quiz', 'quiz')
      .where('attempt.student_id = :studentId', { studentId })
      .andWhere('quiz.course_id = :courseId', { courseId })
      .andWhere('quiz.is_delete = false')
      .orderBy('attempt.submittedAt', 'DESC')
      .addOrderBy('attempt.id', 'DESC')
      .getMany();

    const map = new Map<number, StudentQuizAttemptInfo>();
    for (const attempt of attempts) {
      const quizId = attempt.quiz?.id;
      if (!quizId || map.has(quizId)) continue;

      const isGraded = !!attempt.gradedAt;
      map.set(quizId, {
        attemptId: attempt.id,
        attemptStatus: isGraded ? 'graded' : 'submitted',
        marksObtained: isGraded ? attempt.totalMarks : null,
        comments: attempt.comments,
        submittedAt: attempt.submittedAt,
      });
    }
    return map;
  }

  private async getTeacherQuizAttemptStatsByCourse(
    courseId: number,
  ): Promise<Map<number, TeacherQuizAttemptStats>> {
    const rows = await this.quizAttemptsRepository
      .createQueryBuilder('attempt')
      .innerJoin('attempt.quiz', 'quiz')
      .select('quiz.id', 'quizId')
      .addSelect('COUNT(attempt.id)', 'attemptCount')
      .addSelect(
        `SUM(CASE WHEN attempt.gradedAt IS NULL THEN 1 ELSE 0 END)`,
        'ungradedCount',
      )
      .addSelect(
        `SUM(CASE WHEN attempt.gradedAt IS NOT NULL THEN 1 ELSE 0 END)`,
        'gradedCount',
      )
      .where('quiz.course_id = :courseId', { courseId })
      .andWhere('quiz.is_delete = false')
      .groupBy('quiz.id')
      .getRawMany();

    const map = new Map<number, TeacherQuizAttemptStats>();
    for (const row of rows) {
      map.set(Number(row.quizId), {
        attemptCount: Number(row.attemptCount ?? 0),
        ungradedCount: Number(row.ungradedCount ?? 0),
        gradedCount: Number(row.gradedCount ?? 0),
      });
    }
    return map;
  }
}
