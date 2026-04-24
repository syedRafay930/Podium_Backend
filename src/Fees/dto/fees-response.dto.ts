import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  @ApiProperty({
    description: 'Transaction UUID',
    example: 'txn_1234567890',
  })
  uuid: string;

  @ApiProperty({
    description: 'Student ID',
    example: 5,
  })
  studentId: number;

  @ApiProperty({
    description: 'Student full name',
    example: 'Emma Thompson',
  })
  studentName: string;

  @ApiProperty({
    description: 'Course ID',
    example: 1,
  })
  courseId: number;

  @ApiProperty({
    description: 'Course name',
    example: 'Introduction to UX Design',
  })
  courseName: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: '$200',
  })
  amount: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'paid',
    enum: ['pending', 'paid'],
  })
  status: string;

  @ApiProperty({
    description: 'Payment type',
    example: 'cash',
    nullable: true,
  })
  paymentType: string | null;

  @ApiProperty({
    description: 'Transaction date',
    example: '2025-01-15',
    nullable: true,
  })
  createdAt: Date | null;
}

export class FeesStatsDto {
  @ApiProperty({
    description: 'Total revenue from paid transactions',
    example: '$800',
  })
  totalRevenue: string;

  @ApiProperty({
    description: 'Number of paid transactions',
    example: 4,
  })
  paidTransactionCount: number;

  @ApiProperty({
    description: 'Total amount pending',
    example: '$200',
  })
  pendingPayments: string;

  @ApiProperty({
    description: 'Number of pending transactions',
    example: 1,
  })
  pendingTransactionCount: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 5,
  })
  totalTransactions: number;
}

export class FeesResponseDto {
  @ApiProperty({
    description: 'Summary statistics',
    type: FeesStatsDto,
  })
  stats: FeesStatsDto;

  @ApiProperty({
    description: 'Paginated transaction list',
    type: [TransactionDto],
  })
  transactions: TransactionDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}
