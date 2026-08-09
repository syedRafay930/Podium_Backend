import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminAssignmentTeacherDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Sara' })
  firstName: string;

  @ApiProperty({ example: 'Ahmed' })
  lastName: string;

  @ApiProperty({ example: 'sara@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+923001234567', nullable: true })
  contactNumber: string | null;
}

class AdminAssignmentCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'Programming', nullable: true })
  name: string | null;
}

export class AdminTeacherAssignmentItemDto {
  @ApiProperty({ example: 3 })
  courseId: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiProperty({ example: true, nullable: true })
  isActive: boolean | null;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'accepted', 'rejected', 'unassigned'],
    description:
      'Assignment state. unassigned = no teacher linked. pending/accepted/rejected map to course.teacherStatus when a teacher is linked (or rejected with teacher retained).',
  })
  assignmentStatus: 'pending' | 'accepted' | 'rejected' | 'unassigned';

  @ApiProperty({
    example: true,
    description: 'True when waiting for teacher accept/reject',
  })
  needsAction: boolean;

  @ApiPropertyOptional({ type: AdminAssignmentTeacherDto, nullable: true })
  teacher: AdminAssignmentTeacherDto | null;

  @ApiPropertyOptional({ type: AdminAssignmentCategoryDto, nullable: true })
  courseCategory: AdminAssignmentCategoryDto | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

export class AdminTeacherAssignmentsMetaDto {
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

export class AdminTeacherAssignmentsStatsDto {
  @ApiProperty({ example: 20 })
  total: number;

  @ApiProperty({ example: 4, description: 'Awaiting teacher response' })
  pending: number;

  @ApiProperty({ example: 12 })
  accepted: number;

  @ApiProperty({ example: 2 })
  rejected: number;

  @ApiProperty({ example: 2, description: 'Courses with no teacher assigned' })
  unassigned: number;
}

export class AdminTeacherAssignmentsListResponseDto {
  @ApiProperty({ type: [AdminTeacherAssignmentItemDto] })
  data: AdminTeacherAssignmentItemDto[];

  @ApiProperty({ type: AdminTeacherAssignmentsMetaDto })
  meta: AdminTeacherAssignmentsMetaDto;

  @ApiProperty({ type: AdminTeacherAssignmentsStatsDto })
  stats: AdminTeacherAssignmentsStatsDto;
}
