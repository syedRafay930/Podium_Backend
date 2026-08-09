import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminStudentListItemDto {
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

  @ApiProperty({ example: 'Student' })
  role: string;

  @ApiPropertyOptional({ example: 'STU-001', nullable: true })
  rollNumber: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

export class AdminStudentsListMetaDto {
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

export class AdminStudentsListStatsDto {
  @ApiProperty({ example: 50, description: 'Total non-deleted students' })
  totalStudents: number;

  @ApiProperty({ example: 45 })
  activeStudents: number;

  @ApiProperty({ example: 5 })
  inactiveStudents: number;

  @ApiProperty({
    example: 30,
    description: 'Students with at least one enrolled course',
  })
  studentsWithEnrollments: number;

  @ApiProperty({
    example: 8,
    description: 'Pending enrollment requests across all students',
  })
  pendingEnrollmentRequests: number;

  @ApiProperty({
    example: 12,
    description: 'Students created in the current calendar month',
  })
  newStudentsThisMonth: number;
}

export class AdminStudentsListResponseDto {
  @ApiProperty({ type: [AdminStudentListItemDto] })
  data: AdminStudentListItemDto[];

  @ApiProperty({ type: AdminStudentsListMetaDto })
  meta: AdminStudentsListMetaDto;

  @ApiProperty({ type: AdminStudentsListStatsDto })
  stats: AdminStudentsListStatsDto;
}
