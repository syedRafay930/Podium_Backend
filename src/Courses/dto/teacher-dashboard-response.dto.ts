import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TeacherDashboardWelcomeDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'teacher@example.com' })
  email: string;
}

class TeacherDashboardMetricsDto {
  @ApiProperty({ example: 3, description: 'Accepted assigned courses' })
  acceptedCoursesCount: number;

  @ApiProperty({
    example: 1,
    description: 'Pending course assignments needing accept/reject',
  })
  pendingCourseAssignmentCount: number;

  @ApiProperty({
    example: 42,
    description: 'Enrolled students across accepted courses',
  })
  studentsEnrolledCount: number;

  @ApiProperty({
    example: 5,
    description: 'Assignment submissions waiting to be graded (submitted/late)',
  })
  submissionsToGradeCount: number;

  @ApiProperty({
    example: 2,
    description: 'Attendance sessions not yet marked',
  })
  unmarkedAttendanceCount: number;

  @ApiProperty({ example: true })
  googleCalendarConnected: boolean;
}

class TeacherDashboardRecentCourseDto {
  @ApiProperty({ example: 2 })
  courseId: number;

  @ApiProperty({ example: 'Web Development' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiProperty({ example: 'accepted' })
  teacherStatus: string;

  @ApiProperty({ example: 12 })
  enrolledStudentsCount: number;
}

class TeacherDashboardPendingAssignmentDto {
  @ApiProperty({ example: 5 })
  courseId: number;

  @ApiProperty({ example: 'Advanced TypeScript' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiProperty({ example: 'pending' })
  teacherStatus: string;

  @ApiProperty({ example: true })
  needsAction: boolean;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

class TeacherDashboardGradingItemDto {
  @ApiProperty({ example: 10 })
  assignmentId: number;

  @ApiProperty({ example: 'Homework 1' })
  title: string;

  @ApiProperty({ example: 2 })
  courseId: number;

  @ApiProperty({ example: 'Web Development' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  dueDate: Date | null;

  @ApiProperty({ example: 3 })
  pendingSubmissionCount: number;
}

class TeacherDashboardAttendanceItemDto {
  @ApiProperty({ example: 101 })
  attendanceId: number;

  @ApiPropertyOptional({ example: '2026-08-06', nullable: true })
  attendanceDate: string | null;

  @ApiProperty({ example: false })
  isMarked: boolean;

  @ApiProperty({ example: 'Live Session 1' })
  lectureTitle: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  lectureId: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  courseId: number | null;

  @ApiPropertyOptional({ example: 'Web Development', nullable: true })
  courseName: string | null;
}

class TeacherDashboardGoogleCalendarDto {
  @ApiProperty({ example: true })
  connected: boolean;

  @ApiPropertyOptional({ example: 'teacher@gmail.com', nullable: true })
  googleEmail?: string | null;
}

export class TeacherDashboardResponseDto {
  @ApiProperty({ type: TeacherDashboardWelcomeDto })
  welcome: TeacherDashboardWelcomeDto;

  @ApiProperty({ type: TeacherDashboardMetricsDto })
  metrics: TeacherDashboardMetricsDto;

  @ApiProperty({ type: [TeacherDashboardRecentCourseDto] })
  recentCourses: TeacherDashboardRecentCourseDto[];

  @ApiProperty({ type: [TeacherDashboardPendingAssignmentDto] })
  pendingCourseAssignments: TeacherDashboardPendingAssignmentDto[];

  @ApiProperty({ type: [TeacherDashboardGradingItemDto] })
  gradingQueue: TeacherDashboardGradingItemDto[];

  @ApiProperty({ type: [TeacherDashboardAttendanceItemDto] })
  recentAttendance: TeacherDashboardAttendanceItemDto[];

  @ApiProperty({ type: TeacherDashboardGoogleCalendarDto })
  googleCalendar: TeacherDashboardGoogleCalendarDto;
}
