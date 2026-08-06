import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EnrollmentRequestCourseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg', nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ example: 'Learn web basics', nullable: true })
  shortDescription: string | null;

  @ApiPropertyOptional({
    description: 'Course category',
    nullable: true,
  })
  courseCategory: {
    id: number;
    name?: string;
  } | null;

  @ApiPropertyOptional({
    description: 'Assigned teacher (password excluded)',
    nullable: true,
  })
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

class EnrollmentRequestTransactionDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: '99.99' })
  amount: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'paid', 'free', 'failed'],
  })
  status: string;

  @ApiPropertyOptional({
    example: 'online',
    nullable: true,
    enum: ['online', 'cash', null],
  })
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

class EnrollmentRequestItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'enrolled', 'rejected', 'dismissed'],
  })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    example: 'Payment proof unclear',
    nullable: true,
  })
  rejectionReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: EnrollmentRequestCourseDto })
  course: EnrollmentRequestCourseDto;

  @ApiPropertyOptional({
    type: EnrollmentRequestTransactionDto,
    nullable: true,
  })
  transaction: EnrollmentRequestTransactionDto | null;
}

class EnrollmentRequestSummaryDto {
  @ApiProperty({ example: 2 })
  pending: number;

  @ApiProperty({ example: 5 })
  enrolled: number;

  @ApiProperty({ example: 1 })
  rejected: number;

  @ApiProperty({ example: 0 })
  dismissed: number;

  @ApiProperty({ example: 8 })
  total: number;
}

export class MyEnrollmentRequestsResponseDto {
  @ApiProperty({
    type: [EnrollmentRequestItemDto],
    description: 'Student enrollment requests list',
  })
  data: EnrollmentRequestItemDto[];

  @ApiProperty({
    type: EnrollmentRequestSummaryDto,
    description: 'Counts for the current filter set',
  })
  summary: EnrollmentRequestSummaryDto;
}
