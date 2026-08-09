import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminTeacherListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sara' })
  firstName: string;

  @ApiProperty({ example: 'Ahmed' })
  lastName: string;

  @ApiProperty({ example: 'sara@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+923001234567', nullable: true })
  contactNumber: string | null;

  @ApiProperty({ example: 'Teacher' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;
}

export class AdminTeachersListMetaDto {
  @ApiProperty({ example: 20 })
  totalItems: number;

  @ApiProperty({ example: 10 })
  itemCount: number;

  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @ApiProperty({ example: 2 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;
}

export class AdminTeachersListStatsDto {
  @ApiProperty({ example: 20, description: 'Total non-deleted teachers' })
  totalTeachers: number;

  @ApiProperty({ example: 18 })
  activeTeachers: number;

  @ApiProperty({ example: 2 })
  inactiveTeachers: number;

  @ApiProperty({
    example: 12,
    description: 'Teachers with at least one accepted course assignment',
  })
  teachersWithAcceptedCourses: number;

  @ApiProperty({
    example: 5,
    description: 'Pending course assignments awaiting teacher accept/reject',
  })
  pendingCourseAssignments: number;

  @ApiProperty({
    example: 3,
    description: 'Teachers created in the current calendar month',
  })
  newTeachersThisMonth: number;
}

export class AdminTeachersListResponseDto {
  @ApiProperty({ type: [AdminTeacherListItemDto] })
  data: AdminTeacherListItemDto[];

  @ApiProperty({ type: AdminTeachersListMetaDto })
  meta: AdminTeachersListMetaDto;

  @ApiProperty({ type: AdminTeachersListStatsDto })
  stats: AdminTeachersListStatsDto;
}
