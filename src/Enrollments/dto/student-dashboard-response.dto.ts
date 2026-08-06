import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DashboardWelcomeDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: 'Final' })
  firstName: string;

  @ApiProperty({ example: 'Test' })
  lastName: string;

  @ApiProperty({ example: 'final.test@example.com' })
  email: string;
}

class DashboardAttendanceMetricsDto {
  @ApiProperty({ example: 8 })
  present: number;

  @ApiProperty({ example: 2 })
  absent: number;

  @ApiProperty({ example: 1 })
  pending: number;

  @ApiProperty({ example: 11 })
  total: number;

  @ApiPropertyOptional({
    example: 80,
    nullable: true,
    description: 'present / (present + absent) * 100, null if none marked',
  })
  ratePercent: number | null;
}

class DashboardMetricsDto {
  @ApiProperty({ example: 3 })
  enrolledCoursesCount: number;

  @ApiProperty({ example: 1 })
  pendingEnrollmentCount: number;

  @ApiPropertyOptional({
    example: 62.5,
    nullable: true,
    description: 'Average overall progress across enrolled courses',
  })
  averageProgressPercent: number | null;

  @ApiProperty({ type: DashboardAttendanceMetricsDto })
  attendance: DashboardAttendanceMetricsDto;
}

class DashboardRecentCourseDto {
  @ApiProperty({ example: 10 })
  enrollmentId: number;

  @ApiProperty({ example: 2 })
  courseId: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiProperty({
    example: { total: 20, completed: 8 },
  })
  overall: { total: number; completed: number };

  @ApiPropertyOptional({ example: 40, nullable: true })
  progressPercent: number | null;
}

class DashboardPendingEnrollmentDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: 2 })
  courseId: number;

  @ApiProperty({ example: 'Advanced TypeScript' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({
    example: 'pending',
    nullable: true,
    description: 'Transaction/payment status',
  })
  paymentStatus: string | null;
}

class DashboardRecentUpdateDto {
  @ApiProperty({
    example: 'lecture',
    enum: ['lecture', 'assignment', 'quiz', 'resource'],
  })
  type: 'lecture' | 'assignment' | 'quiz' | 'resource';

  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'HTML Basics' })
  title: string;

  @ApiPropertyOptional({ nullable: true })
  occurredAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lectureType?: string | null;

  @ApiProperty({
    example: { id: 2, courseName: 'Web Dev' },
  })
  course: { id: number; courseName: string };

  @ApiPropertyOptional({
    nullable: true,
    example: { id: 5, title: 'Week 1' },
  })
  section: { id: number; title: string } | null;
}

class DashboardRecentAttendanceDto {
  @ApiProperty({ example: 101 })
  attendanceId: number;

  @ApiPropertyOptional({ example: '2026-08-06', nullable: true })
  attendanceDate: string | null;

  @ApiProperty({ example: 'present', enum: ['present', 'absent', '-'] })
  status: string;

  @ApiProperty({ example: 'Live Session 1' })
  lectureTitle: string;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiProperty({ example: 2 })
  courseId: number;
}

export class StudentDashboardResponseDto {
  @ApiProperty({ type: DashboardWelcomeDto })
  welcome: DashboardWelcomeDto;

  @ApiProperty({ type: DashboardMetricsDto })
  metrics: DashboardMetricsDto;

  @ApiProperty({ type: [DashboardRecentCourseDto] })
  recentCourses: DashboardRecentCourseDto[];

  @ApiProperty({ type: [DashboardPendingEnrollmentDto] })
  pendingEnrollments: DashboardPendingEnrollmentDto[];

  @ApiProperty({ type: [DashboardRecentUpdateDto] })
  recentUpdates: DashboardRecentUpdateDto[];

  @ApiProperty({ type: [DashboardRecentAttendanceDto] })
  recentAttendance: DashboardRecentAttendanceDto[];
}
