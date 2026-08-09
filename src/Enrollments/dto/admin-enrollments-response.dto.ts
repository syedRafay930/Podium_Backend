import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminEnrollmentStudentDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  lastName: string;

  @ApiProperty({ example: 'ali@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'STU-001', nullable: true })
  rollNumber: string | null;

  @ApiPropertyOptional({ example: '+923001234567', nullable: true })
  contactNumber: string | null;
}

class AdminEnrollmentCourseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;
}

class AdminEnrollmentTransactionDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'txn_msix67og' })
  uuid: string;

  @ApiProperty({ example: '99.99' })
  amount: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'paid', 'free', 'failed'],
  })
  status: string;

  @ApiPropertyOptional({ example: 'online', nullable: true })
  paymentType: string | null;

  @ApiPropertyOptional({
    example: 'https://s3.amazonaws.com/.../screenshot.png',
    nullable: true,
  })
  screenshotUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

export class AdminEnrollmentListItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'enrolled', 'rejected', 'dismissed'],
  })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  lectureViewed: number;

  @ApiPropertyOptional({ example: 'Payment proof unclear', nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: AdminEnrollmentStudentDto })
  student: AdminEnrollmentStudentDto | null;

  @ApiProperty({ type: AdminEnrollmentCourseDto })
  course: AdminEnrollmentCourseDto | null;

  @ApiPropertyOptional({
    type: AdminEnrollmentTransactionDto,
    nullable: true,
  })
  transaction: AdminEnrollmentTransactionDto | null;

  @ApiPropertyOptional({
    description: 'Admin/student who created the enrollment',
    nullable: true,
  })
  enrolledBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export class AdminEnrollmentsListMetaDto {
  @ApiProperty({ example: 50 })
  totalItems: number;

  @ApiProperty({ example: 10 })
  itemCount: number;

  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;
}

export class AdminEnrollmentsListStatsDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 8 })
  pending: number;

  @ApiProperty({ example: 35 })
  enrolled: number;

  @ApiProperty({ example: 5 })
  rejected: number;

  @ApiProperty({ example: 2 })
  dismissed: number;
}

export class AdminEnrollmentsListResponseDto {
  @ApiProperty({ type: [AdminEnrollmentListItemDto] })
  data: AdminEnrollmentListItemDto[];

  @ApiProperty({ type: AdminEnrollmentsListMetaDto })
  meta: AdminEnrollmentsListMetaDto;

  @ApiProperty({ type: AdminEnrollmentsListStatsDto })
  stats: AdminEnrollmentsListStatsDto;
}
