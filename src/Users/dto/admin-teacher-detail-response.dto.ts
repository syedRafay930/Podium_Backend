import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminTeacherProfileDto {
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

  @ApiPropertyOptional({ nullable: true })
  updatedAt: Date | null;
}

class AdminTeacherProfileStatsDto {
  @ApiProperty({ example: 4 })
  acceptedCourses: number;

  @ApiProperty({ example: 1 })
  pendingCourseAssignments: number;

  @ApiProperty({ example: 5 })
  totalAssignedCourses: number;

  @ApiProperty({
    example: 42,
    description: 'Enrolled students across accepted courses',
  })
  studentsEnrolled: number;

  @ApiProperty({
    example: 7,
    description: 'Submissions waiting to be graded (submitted/late)',
  })
  pendingSubmissionsToGrade: number;

  @ApiProperty({
    example: 2,
    description: 'Attendance sessions not yet marked',
  })
  unmarkedAttendanceSessions: number;
}

class AdminTeacherCourseItemDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ example: 'Learn web basics', nullable: true })
  shortDescription: string | null;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiProperty({ example: true, nullable: true })
  isActive: boolean | null;

  @ApiProperty({
    example: 'accepted',
    enum: ['pending', 'accepted', 'rejected'],
  })
  teacherStatus: string;

  @ApiProperty({ example: 12 })
  enrolledStudentsCount: number;

  @ApiPropertyOptional({ nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Course category',
  })
  courseCategory: {
    id: number;
    name?: string;
  } | null;
}

export class AdminTeacherDetailResponseDto {
  @ApiProperty({ type: AdminTeacherProfileDto })
  teacher: AdminTeacherProfileDto;

  @ApiProperty({ type: AdminTeacherProfileStatsDto })
  stats: AdminTeacherProfileStatsDto;

  @ApiProperty({ type: [AdminTeacherCourseItemDto] })
  courses: AdminTeacherCourseItemDto[];
}
