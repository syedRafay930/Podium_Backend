import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminDashboardWelcomeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'User' })
  lastName: string;

  @ApiProperty({ example: 'admin@podium.com' })
  email: string;
}

class CountSliceDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 45 })
  active: number;

  @ApiProperty({ example: 5 })
  newThisMonth: number;
}

class CoursesMetricsDto {
  @ApiProperty({ example: 20 })
  total: number;

  @ApiProperty({ example: 18 })
  active: number;

  @ApiProperty({ example: 15 })
  withTeacher: number;

  @ApiProperty({ example: 5 })
  withoutTeacher: number;
}

class EnrollmentsMetricsDto {
  @ApiProperty({ example: 80 })
  total: number;

  @ApiProperty({ example: 8 })
  pending: number;

  @ApiProperty({ example: 60 })
  enrolled: number;

  @ApiProperty({ example: 10 })
  rejected: number;

  @ApiProperty({ example: 2 })
  dismissed: number;
}

class TeacherAssignmentsMetricsDto {
  @ApiProperty({ example: 4 })
  pending: number;

  @ApiProperty({ example: 12 })
  accepted: number;

  @ApiProperty({ example: 2 })
  rejected: number;

  @ApiProperty({ example: 2 })
  unassigned: number;
}

class RevenueMetricsDto {
  @ApiProperty({ example: '12500.00', description: 'Sum of paid transactions' })
  totalRevenue: string;

  @ApiProperty({ example: '800.00', description: 'Sum of pending payments' })
  pendingAmount: string;

  @ApiProperty({ example: '450.00', description: 'Paid revenue this calendar month' })
  revenueThisMonth: string;

  @ApiProperty({ example: 40 })
  paidCount: number;

  @ApiProperty({ example: 6 })
  pendingCount: number;

  @ApiProperty({ example: 3 })
  failedCount: number;

  @ApiProperty({ example: 5 })
  freeCount: number;
}

class PlatformWorkloadDto {
  @ApiProperty({
    example: 12,
    description: 'Assignment submissions awaiting grade (submitted/late)',
  })
  pendingSubmissionsToGrade: number;

  @ApiProperty({
    example: 4,
    description: 'Attendance sessions not yet marked',
  })
  unmarkedAttendanceSessions: number;
}

class AdminDashboardMetricsDto {
  @ApiProperty({ type: CountSliceDto })
  students: CountSliceDto;

  @ApiProperty({ type: CountSliceDto })
  teachers: CountSliceDto;

  @ApiProperty({ type: CoursesMetricsDto })
  courses: CoursesMetricsDto;

  @ApiProperty({ type: EnrollmentsMetricsDto })
  enrollments: EnrollmentsMetricsDto;

  @ApiProperty({ type: TeacherAssignmentsMetricsDto })
  teacherAssignments: TeacherAssignmentsMetricsDto;

  @ApiProperty({ type: RevenueMetricsDto })
  revenue: RevenueMetricsDto;

  @ApiProperty({ type: PlatformWorkloadDto })
  workload: PlatformWorkloadDto;
}

class PendingEnrollmentItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: 'Ali Khan' })
  studentName: string;

  @ApiProperty({ example: 5 })
  studentId: number;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiProperty({ example: 2 })
  courseId: number;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  amount: string | null;

  @ApiPropertyOptional({ nullable: true })
  screenshotUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

class PendingTeacherAssignmentItemDto {
  @ApiProperty({ example: 3 })
  courseId: number;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiPropertyOptional({ example: 'Sara Ahmed', nullable: true })
  teacherName: string | null;

  @ApiPropertyOptional({ example: 5, nullable: true })
  teacherId: number | null;

  @ApiProperty({ example: 'pending' })
  assignmentStatus: string;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

class PendingPaymentItemDto {
  @ApiProperty({ example: 'txn_xxx' })
  uuid: string;

  @ApiProperty({ example: 'Ali Khan' })
  studentName: string;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiProperty({ example: '99.99' })
  amount: string;

  @ApiPropertyOptional({ nullable: true })
  screenshotUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

class ActionRequiredDto {
  @ApiProperty({ type: [PendingEnrollmentItemDto] })
  pendingEnrollments: PendingEnrollmentItemDto[];

  @ApiProperty({ type: [PendingTeacherAssignmentItemDto] })
  pendingTeacherAssignments: PendingTeacherAssignmentItemDto[];

  @ApiProperty({ type: [PendingPaymentItemDto] })
  pendingPayments: PendingPaymentItemDto[];
}

class RecentEnrollmentItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: 'enrolled' })
  status: string;

  @ApiProperty({ example: 'Ali Khan' })
  studentName: string;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

class RecentCourseItemDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Web Dev' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiProperty({ example: 'accepted' })
  teacherStatus: string;

  @ApiPropertyOptional({ example: 'Sara Ahmed', nullable: true })
  teacherName: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

class RecentStudentItemDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  lastName: string;

  @ApiProperty({ example: 'ali@example.com' })
  email: string;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

class RecentActivityDto {
  @ApiProperty({ type: [RecentEnrollmentItemDto] })
  recentEnrollments: RecentEnrollmentItemDto[];

  @ApiProperty({ type: [RecentCourseItemDto] })
  recentCourses: RecentCourseItemDto[];

  @ApiProperty({ type: [RecentStudentItemDto] })
  recentStudents: RecentStudentItemDto[];
}

class ChartSliceDto {
  @ApiProperty({ example: 'pending' })
  label: string;

  @ApiProperty({ example: 8 })
  value: number;
}

class MonthlyRevenueDto {
  @ApiProperty({ example: '2026-03' })
  month: string;

  @ApiProperty({ example: '1200.00' })
  amount: string;
}

class ChartsDto {
  @ApiProperty({ type: [ChartSliceDto] })
  enrollmentsByStatus: ChartSliceDto[];

  @ApiProperty({ type: [ChartSliceDto] })
  coursesByAssignmentStatus: ChartSliceDto[];

  @ApiProperty({ type: [MonthlyRevenueDto] })
  revenueLast6Months: MonthlyRevenueDto[];
}

export class AdminDashboardResponseDto {
  @ApiProperty({ type: AdminDashboardWelcomeDto })
  welcome: AdminDashboardWelcomeDto;

  @ApiProperty({ type: AdminDashboardMetricsDto })
  metrics: AdminDashboardMetricsDto;

  @ApiProperty({ type: ActionRequiredDto })
  actionRequired: ActionRequiredDto;

  @ApiProperty({ type: RecentActivityDto })
  recentActivity: RecentActivityDto;

  @ApiProperty({ type: ChartsDto })
  charts: ChartsDto;
}
