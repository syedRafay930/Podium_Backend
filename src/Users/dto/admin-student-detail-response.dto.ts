import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminStudentProfileDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  lastName: string;

  @ApiProperty({ example: 'ali@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+923001234567', nullable: true })
  contactNumber: string | null;

  @ApiPropertyOptional({ example: 'STU-001', nullable: true })
  rollNumber: string | null;

  @ApiProperty({ example: 'Student' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

class AdminStudentProfileStatsDto {
  @ApiProperty({ example: 3 })
  enrolledCourses: number;

  @ApiProperty({ example: 1 })
  pendingEnrollments: number;

  @ApiProperty({ example: 1 })
  rejectedEnrollments: number;

  @ApiProperty({ example: 5 })
  totalEnrollments: number;

  @ApiProperty({ example: 10 })
  attendancePresent: number;

  @ApiProperty({ example: 2 })
  attendanceAbsent: number;

  @ApiPropertyOptional({
    example: 83.3,
    nullable: true,
    description: 'Present / (present + absent) * 100',
  })
  attendanceRatePercent: number | null;

  @ApiProperty({ example: 2 })
  paidTransactions: number;

  @ApiProperty({ example: 1 })
  pendingPayments: number;

  @ApiProperty({ example: 1 })
  failedPayments: number;

  @ApiProperty({ example: '199.98', description: 'Sum of paid transaction amounts' })
  totalPaidAmount: string;
}

class AdminStudentEnrollmentCourseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Assigned teacher (password excluded)',
  })
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

class AdminStudentEnrollmentTransactionDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: '99.99' })
  amount: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'paid', 'free', 'failed'],
  })
  status: string;

  @ApiPropertyOptional({ example: 'online', nullable: true })
  paymentType: string | null;

  @ApiPropertyOptional({ nullable: true })
  screenshotUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

class AdminStudentEnrollmentItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({
    example: 'enrolled',
    enum: ['pending', 'enrolled', 'rejected', 'dismissed'],
  })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 5 })
  lectureViewed: number;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: AdminStudentEnrollmentCourseDto })
  course: AdminStudentEnrollmentCourseDto | null;

  @ApiPropertyOptional({
    type: AdminStudentEnrollmentTransactionDto,
    nullable: true,
  })
  transaction: AdminStudentEnrollmentTransactionDto | null;
}

class AdminStudentRecentAttendanceDto {
  @ApiProperty({ example: 1 })
  attendanceId: number;

  @ApiPropertyOptional({ example: '2026-08-01', nullable: true })
  attendanceDate: string | null;

  @ApiProperty({ example: 'present', enum: ['present', 'absent'] })
  status: string;

  @ApiPropertyOptional({ example: 'Intro Lecture', nullable: true })
  lectureTitle: string | null;

  @ApiPropertyOptional({ example: 'Web Dev', nullable: true })
  courseName: string | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  courseId: number | null;
}

export class AdminStudentDetailResponseDto {
  @ApiProperty({ type: AdminStudentProfileDto })
  student: AdminStudentProfileDto;

  @ApiProperty({ type: AdminStudentProfileStatsDto })
  stats: AdminStudentProfileStatsDto;

  @ApiProperty({ type: [AdminStudentEnrollmentItemDto] })
  enrollments: AdminStudentEnrollmentItemDto[];

  @ApiProperty({ type: [AdminStudentRecentAttendanceDto] })
  recentAttendance: AdminStudentRecentAttendanceDto[];
}
