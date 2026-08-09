import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Assignment } from 'src/Entities/entities/Assignment';
import { AssignmentSubmission } from 'src/Entities/entities/AssignmentSubmission';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { QuizAttempts } from 'src/Entities/entities/QuizAttempts';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { StudentLectureProgress } from 'src/Entities/entities/StudentLectureProgress';
import { AttendanceDetails } from 'src/Entities/entities/AttendanceDetails';
import { CourseProgressResponseDto } from './dto/course-progress-response.dto';

const COMPLETED_ASSIGNMENT_STATUSES = ['submitted', 'graded', 'late'];

export type ContentCompletionSets = {
  lectureIds: Set<number>;
  assignmentIds: Set<number>;
  quizIds: Set<number>;
};

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Lectures)
    private readonly lectureRepository: Repository<Lectures>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(Quizzes)
    private readonly quizRepository: Repository<Quizzes>,
    @InjectRepository(QuizAttempts)
    private readonly quizAttemptsRepository: Repository<QuizAttempts>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(StudentLectureProgress)
    private readonly lectureProgressRepository: Repository<StudentLectureProgress>,
    @InjectRepository(AttendanceDetails)
    private readonly attendanceDetailsRepository: Repository<AttendanceDetails>,
  ) {}

  async assertStudentEnrolled(studentId: number, courseId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: 'enrolled',
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access progress',
      );
    }

    return enrollment;
  }

  async getCourseProgress(
    studentId: number,
    courseId: number,
    requireEnrollment = true,
  ): Promise<CourseProgressResponseDto> {
    if (requireEnrollment) {
      await this.assertStudentEnrolled(studentId, courseId);
    }

    const [
      lecturesTotal,
      assignmentsTotal,
      quizzesTotal,
      lecturesCompleted,
      assignmentsCompleted,
      quizzesCompleted,
    ] = await Promise.all([
      this.countLectures(courseId),
      this.countAssignments(courseId),
      this.countQuizzes(courseId),
      this.countCompletedLectures(studentId, courseId),
      this.countCompletedAssignments(studentId, courseId),
      this.countCompletedQuizzes(studentId, courseId),
    ]);

    return this.buildProgressResponse(
      courseId,
      lecturesTotal,
      lecturesCompleted,
      assignmentsTotal,
      assignmentsCompleted,
      quizzesTotal,
      quizzesCompleted,
    );
  }

  /**
   * Batch progress for many courses (avoids N+1 on my-enrolled-courses).
   */
  async getCoursesProgressBatch(
    studentId: number,
    courseIds: number[],
  ): Promise<Map<number, CourseProgressResponseDto>> {
    const result = new Map<number, CourseProgressResponseDto>();
    if (!courseIds.length) {
      return result;
    }

    const uniqueCourseIds = [...new Set(courseIds)];

    const [
      lectureTotals,
      assignmentTotals,
      quizTotals,
      recordedCompleted,
      liveCompleted,
      assignmentCompleted,
      quizCompleted,
    ] = await Promise.all([
      this.lectureRepository
        .createQueryBuilder('lecture')
        .select('lecture.course_id', 'courseId')
        .addSelect('COUNT(*)', 'count')
        .where('lecture.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .andWhere('lecture.isDelete = false')
        .groupBy('lecture.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
      this.assignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.course_id', 'courseId')
        .addSelect('COUNT(*)', 'count')
        .where('assignment.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .groupBy('assignment.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
      this.quizRepository
        .createQueryBuilder('quiz')
        .select('quiz.course_id', 'courseId')
        .addSelect('COUNT(*)', 'count')
        .where('quiz.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .andWhere('quiz.isDelete = false')
        .andWhere('quiz.isPublished = true')
        .groupBy('quiz.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
      this.lectureProgressRepository
        .createQueryBuilder('progress')
        .innerJoin('progress.lecture', 'lecture')
        .select('progress.courseId', 'courseId')
        .addSelect('COUNT(DISTINCT progress.lectureId)', 'count')
        .where('progress.studentId = :studentId', { studentId })
        .andWhere('progress.courseId IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .andWhere('lecture.isDelete = false')
        .andWhere('lecture.lectureType = :type', { type: 'recorded' })
        .groupBy('progress.courseId')
        .getRawMany<{ courseId: string; count: string }>(),
      this.attendanceDetailsRepository
        .createQueryBuilder('details')
        .innerJoin('details.student', 'student')
        .innerJoin('details.attendance', 'attendance')
        .innerJoin('attendance.lecture', 'lecture')
        .select('lecture.course_id', 'courseId')
        .addSelect('COUNT(DISTINCT lecture.id)', 'count')
        .where('student.id = :studentId', { studentId })
        .andWhere('details.status = :status', { status: 'present' })
        .andWhere('lecture.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .andWhere('lecture.isDelete = false')
        .andWhere('lecture.lectureType IN (:...types)', {
          types: ['live', 'online'],
        })
        .groupBy('lecture.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
      this.assignmentSubmissionRepository
        .createQueryBuilder('submission')
        .innerJoin('submission.student', 'student')
        .innerJoin('submission.assignment', 'assignment')
        .select('assignment.course_id', 'courseId')
        .addSelect('COUNT(DISTINCT assignment.id)', 'count')
        .where('student.id = :studentId', { studentId })
        .andWhere('submission.status IN (:...statuses)', {
          statuses: COMPLETED_ASSIGNMENT_STATUSES,
        })
        .andWhere('assignment.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .groupBy('assignment.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
      this.quizAttemptsRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.student', 'student')
        .innerJoin('attempt.quiz', 'quiz')
        .select('quiz.course_id', 'courseId')
        .addSelect('COUNT(DISTINCT quiz.id)', 'count')
        .where('student.id = :studentId', { studentId })
        .andWhere('attempt.submittedAt IS NOT NULL')
        .andWhere('quiz.course_id IN (:...courseIds)', {
          courseIds: uniqueCourseIds,
        })
        .andWhere('quiz.isDelete = false')
        .andWhere('quiz.isPublished = true')
        .groupBy('quiz.course_id')
        .getRawMany<{ courseId: string; count: string }>(),
    ]);

    const toMap = (rows: { courseId: string; count: string }[]) => {
      const map = new Map<number, number>();
      for (const row of rows) {
        map.set(Number(row.courseId), Number(row.count) || 0);
      }
      return map;
    };

    const lectureTotalMap = toMap(lectureTotals);
    const assignmentTotalMap = toMap(assignmentTotals);
    const quizTotalMap = toMap(quizTotals);
    const recordedMap = toMap(recordedCompleted);
    const liveMap = toMap(liveCompleted);
    const assignmentCompletedMap = toMap(assignmentCompleted);
    const quizCompletedMap = toMap(quizCompleted);

    for (const courseId of uniqueCourseIds) {
      const lecturesTotal = lectureTotalMap.get(courseId) || 0;
      const lecturesCompleted =
        (recordedMap.get(courseId) || 0) + (liveMap.get(courseId) || 0);
      const assignmentsTotal = assignmentTotalMap.get(courseId) || 0;
      const assignmentsCompletedCount =
        assignmentCompletedMap.get(courseId) || 0;
      const quizzesTotal = quizTotalMap.get(courseId) || 0;
      const quizzesCompletedCount = quizCompletedMap.get(courseId) || 0;

      result.set(
        courseId,
        this.buildProgressResponse(
          courseId,
          lecturesTotal,
          Math.min(lecturesCompleted, lecturesTotal),
          assignmentsTotal,
          assignmentsCompletedCount,
          quizzesTotal,
          quizzesCompletedCount,
        ),
      );
    }

    return result;
  }

  async getContentCompletionSets(
    studentId: number,
    courseId: number,
  ): Promise<ContentCompletionSets> {
    const [recordedIds, liveIds, assignmentIds, quizIds] = await Promise.all([
      this.lectureProgressRepository
        .createQueryBuilder('progress')
        .innerJoin('progress.lecture', 'lecture')
        .select('progress.lectureId', 'lectureId')
        .where('progress.studentId = :studentId', { studentId })
        .andWhere('progress.courseId = :courseId', { courseId })
        .andWhere('lecture.isDelete = false')
        .getRawMany<{ lectureId: number }>(),
      this.attendanceDetailsRepository
        .createQueryBuilder('details')
        .innerJoin('details.student', 'student')
        .innerJoin('details.attendance', 'attendance')
        .innerJoin('attendance.lecture', 'lecture')
        .select('lecture.id', 'lectureId')
        .where('student.id = :studentId', { studentId })
        .andWhere('details.status = :status', { status: 'present' })
        .andWhere('lecture.course_id = :courseId', { courseId })
        .andWhere('lecture.isDelete = false')
        .andWhere('lecture.lectureType IN (:...types)', {
          types: ['live', 'online'],
        })
        .getRawMany<{ lectureId: number }>(),
      this.assignmentSubmissionRepository
        .createQueryBuilder('submission')
        .innerJoin('submission.student', 'student')
        .innerJoin('submission.assignment', 'assignment')
        .select('assignment.id', 'assignmentId')
        .where('student.id = :studentId', { studentId })
        .andWhere('submission.status IN (:...statuses)', {
          statuses: COMPLETED_ASSIGNMENT_STATUSES,
        })
        .andWhere('assignment.course_id = :courseId', { courseId })
        .getRawMany<{ assignmentId: number }>(),
      this.quizAttemptsRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.student', 'student')
        .innerJoin('attempt.quiz', 'quiz')
        .select('quiz.id', 'quizId')
        .where('student.id = :studentId', { studentId })
        .andWhere('attempt.submittedAt IS NOT NULL')
        .andWhere('quiz.course_id = :courseId', { courseId })
        .andWhere('quiz.isDelete = false')
        .andWhere('quiz.isPublished = true')
        .getRawMany<{ quizId: number }>(),
    ]);

    return {
      lectureIds: new Set([
        ...recordedIds.map((r) => Number(r.lectureId)),
        ...liveIds.map((r) => Number(r.lectureId)),
      ]),
      assignmentIds: new Set(assignmentIds.map((r) => Number(r.assignmentId))),
      quizIds: new Set(quizIds.map((r) => Number(r.quizId))),
    };
  }

  async markRecordedLectureComplete(studentId: number, lectureId: number) {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['course'],
    });

    if (!lecture || lecture.isDelete) {
      throw new NotFoundException('Lecture not found');
    }

    if (lecture.lectureType !== 'recorded') {
      throw new BadRequestException(
        'Only recorded lectures can be marked complete via this endpoint. Live/online lectures use attendance.',
      );
    }

    const courseId = lecture.course?.id;
    if (!courseId) {
      throw new BadRequestException('Lecture is not linked to a course');
    }

    await this.assertStudentEnrolled(studentId, courseId);

    const existing = await this.lectureProgressRepository.findOne({
      where: { studentId, lectureId },
    });

    if (existing) {
      return {
        message: 'Lecture already marked as complete',
        lectureId,
        courseId,
        completedAt: existing.completedAt,
      };
    }

    const progress = this.lectureProgressRepository.create({
      studentId,
      lectureId,
      courseId,
      completedAt: new Date(),
    });
    const saved = await this.lectureProgressRepository.save(progress);

    return {
      message: 'Lecture marked as complete',
      lectureId,
      courseId,
      completedAt: saved.completedAt,
    };
  }

  private buildProgressResponse(
    courseId: number,
    lecturesTotal: number,
    lecturesCompleted: number,
    assignmentsTotal: number,
    assignmentsCompleted: number,
    quizzesTotal: number,
    quizzesCompleted: number,
  ): CourseProgressResponseDto {
    return {
      courseId,
      lectures: { total: lecturesTotal, completed: lecturesCompleted },
      assignments: {
        total: assignmentsTotal,
        completed: assignmentsCompleted,
      },
      quizzes: { total: quizzesTotal, completed: quizzesCompleted },
      overall: {
        total: lecturesTotal + assignmentsTotal + quizzesTotal,
        completed:
          lecturesCompleted + assignmentsCompleted + quizzesCompleted,
      },
    };
  }

  private countLectures(courseId: number) {
    return this.lectureRepository
      .createQueryBuilder('lecture')
      .where('lecture.course_id = :courseId', { courseId })
      .andWhere('lecture.isDelete = false')
      .getCount();
  }

  private countAssignments(courseId: number) {
    return this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.course_id = :courseId', { courseId })
      .getCount();
  }

  private countQuizzes(courseId: number) {
    return this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.course_id = :courseId', { courseId })
      .andWhere('quiz.isDelete = false')
      .andWhere('quiz.isPublished = true')
      .getCount();
  }

  private async countCompletedLectures(studentId: number, courseId: number) {
    const sets = await this.getContentCompletionSets(studentId, courseId);
    // Only count lectures that still exist in the course (non-deleted)
    const validLectureIds = await this.lectureRepository
      .createQueryBuilder('lecture')
      .select('lecture.id', 'id')
      .where('lecture.course_id = :courseId', { courseId })
      .andWhere('lecture.isDelete = false')
      .getRawMany<{ id: number }>();

    const validIds = new Set(validLectureIds.map((r) => Number(r.id)));
    let completed = 0;
    for (const id of sets.lectureIds) {
      if (validIds.has(id)) completed += 1;
    }
    return completed;
  }

  private async countCompletedAssignments(
    studentId: number,
    courseId: number,
  ) {
    const result = await this.assignmentSubmissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.student', 'student')
      .innerJoin('submission.assignment', 'assignment')
      .select('COUNT(DISTINCT assignment.id)', 'count')
      .where('student.id = :studentId', { studentId })
      .andWhere('submission.status IN (:...statuses)', {
        statuses: COMPLETED_ASSIGNMENT_STATUSES,
      })
      .andWhere('assignment.course_id = :courseId', { courseId })
      .getRawOne<{ count: string }>();

    return Number(result?.count) || 0;
  }

  private async countCompletedQuizzes(studentId: number, courseId: number) {
    const result = await this.quizAttemptsRepository
      .createQueryBuilder('attempt')
      .innerJoin('attempt.student', 'student')
      .innerJoin('attempt.quiz', 'quiz')
      .select('COUNT(DISTINCT quiz.id)', 'count')
      .where('student.id = :studentId', { studentId })
      .andWhere('attempt.submittedAt IS NOT NULL')
      .andWhere('quiz.course_id = :courseId', { courseId })
      .andWhere('quiz.isDelete = false')
      .andWhere('quiz.isPublished = true')
      .getRawOne<{ count: string }>();

    return Number(result?.count) || 0;
  }

  /* =====================================================
     STUDENT: COURSE MARKSHEET (ASSIGNMENTS + QUIZZES)
     ===================================================== */

  async getCourseMarksheet(studentId: number, courseId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: 'enrolled',
        isActive: true,
      },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to view the marksheet',
      );
    }

    if (!enrollment.course) {
      throw new NotFoundException('Course not found');
    }

    const [assignments, quizzes, submissions, attempts] = await Promise.all([
      this.assignmentRepository.find({
        where: { course: { id: courseId } },
        relations: ['section'],
        order: { createdAt: 'ASC' },
      }),
      this.quizRepository.find({
        where: {
          course_id: courseId,
          isDelete: false,
          isPublished: true,
        },
        relations: ['section'],
        order: { createdAt: 'ASC' },
      }),
      this.assignmentSubmissionRepository.find({
        where: {
          student: { id: studentId },
          assignment: { course: { id: courseId } },
        },
        relations: ['assignment'],
      }),
      this.quizAttemptsRepository
        .createQueryBuilder('attempt')
        .innerJoinAndSelect('attempt.quiz', 'quiz')
        .innerJoin('attempt.student', 'student')
        .where('student.id = :studentId', { studentId })
        .andWhere('quiz.course_id = :courseId', { courseId })
        .andWhere('quiz.isDelete = false')
        .andWhere('quiz.isPublished = true')
        .orderBy('attempt.submittedAt', 'DESC')
        .addOrderBy('attempt.id', 'DESC')
        .getMany(),
    ]);

    const submissionByAssignmentId = new Map<number, AssignmentSubmission>();
    for (const submission of submissions) {
      if (submission.assignment?.id) {
        submissionByAssignmentId.set(submission.assignment.id, submission);
      }
    }

    const latestAttemptByQuizId = new Map<number, QuizAttempts>();
    for (const attempt of attempts) {
      const quizId = attempt.quiz?.id;
      if (!quizId || latestAttemptByQuizId.has(quizId)) continue;
      latestAttemptByQuizId.set(quizId, attempt);
    }

    const assignmentRows = assignments.map((assignment) => {
      const submission = submissionByAssignmentId.get(assignment.id);
      const status = submission?.status || 'missing';
      const isGraded =
        status === 'graded' || submission?.marksObtained != null;

      return {
        id: assignment.id,
        title: assignment.title,
        sectionId: assignment.sectionId ?? assignment.section?.id ?? null,
        sectionTitle: assignment.section?.title ?? null,
        dueDate: assignment.dueDate,
        totalMarks: assignment.totalMarks,
        status,
        marksObtained: isGraded ? submission?.marksObtained ?? null : null,
        comments: isGraded ? submission?.comments ?? null : null,
        submittedAt: submission?.submittedAt ?? null,
      };
    });

    const quizRows = quizzes.map((quiz) => {
      const attempt = latestAttemptByQuizId.get(quiz.id);
      const isGraded = !!attempt?.gradedAt;
      const attemptStatus: 'missing' | 'submitted' | 'graded' = !attempt
        ? 'missing'
        : isGraded
          ? 'graded'
          : 'submitted';

      return {
        id: quiz.id,
        title: quiz.title,
        sectionId: quiz.section_id ?? quiz.section?.id ?? null,
        sectionTitle: quiz.section?.title ?? null,
        totalMarks: quiz.totalMarks,
        attemptId: attempt?.id ?? null,
        attemptStatus,
        marksObtained: isGraded ? attempt?.totalMarks ?? null : null,
        comments: attempt?.comments ?? null,
        submittedAt: attempt?.submittedAt ?? null,
        gradedAt: attempt?.gradedAt ?? null,
      };
    });

    const assignmentsSummary = this.buildCategorySummary(
      assignmentRows.map((row) => ({
        status: row.status,
        totalMarks: row.totalMarks,
        marksObtained: row.marksObtained,
      })),
    );

    const quizzesSummary = this.buildCategorySummary(
      quizRows.map((row) => ({
        status:
          row.attemptStatus === 'missing'
            ? 'missing'
            : row.attemptStatus === 'graded'
              ? 'graded'
              : 'submitted',
        totalMarks: row.totalMarks,
        marksObtained: row.marksObtained,
      })),
    );

    const gradedTotalMarks =
      assignmentsSummary.gradedTotalMarks + quizzesSummary.gradedTotalMarks;
    const obtainedMarks =
      assignmentsSummary.obtainedMarks + quizzesSummary.obtainedMarks;
    const possibleTotalMarks =
      assignmentsSummary.possibleTotalMarks + quizzesSummary.possibleTotalMarks;

    return {
      student: {
        id: enrollment.student.id,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        email: enrollment.student.email,
      },
      course: {
        id: enrollment.course.id,
        courseName: enrollment.course.courseName,
        coverImg: enrollment.course.coverImg,
        price: enrollment.course.price,
      },
      summary: {
        assignments: assignmentsSummary,
        quizzes: quizzesSummary,
        overall: {
          obtainedMarks,
          gradedTotalMarks,
          possibleTotalMarks,
          percentage: this.toPercentage(obtainedMarks, gradedTotalMarks),
          gradedItems: assignmentsSummary.graded + quizzesSummary.graded,
          totalItems: assignmentsSummary.total + quizzesSummary.total,
        },
      },
      assignments: assignmentRows,
      quizzes: quizRows,
    };
  }

  private buildCategorySummary(
    rows: {
      status: string;
      totalMarks: number | null;
      marksObtained: number | null;
    }[],
  ) {
    let graded = 0;
    let submitted = 0;
    let missing = 0;
    let obtainedMarks = 0;
    let gradedTotalMarks = 0;
    let possibleTotalMarks = 0;

    for (const row of rows) {
      possibleTotalMarks += Number(row.totalMarks ?? 0);

      if (row.status === 'graded') {
        graded += 1;
        obtainedMarks += Number(row.marksObtained ?? 0);
        gradedTotalMarks += Number(row.totalMarks ?? 0);
      } else if (row.status === 'missing') {
        missing += 1;
      } else {
        // submitted / late / awaiting grade
        submitted += 1;
      }
    }

    return {
      total: rows.length,
      graded,
      submitted,
      missing,
      obtainedMarks,
      gradedTotalMarks,
      possibleTotalMarks,
      percentage: this.toPercentage(obtainedMarks, gradedTotalMarks),
    };
  }

  private toPercentage(obtained: number, total: number): number | null {
    if (!total) return null;
    return Math.round((obtained / total) * 1000) / 10;
  }
}
