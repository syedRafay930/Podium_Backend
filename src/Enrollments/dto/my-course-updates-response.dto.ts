import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CourseUpdateCourseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;
}

class CourseUpdateSectionDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Week 1' })
  title: string;
}

export class CourseUpdateItemDto {
  @ApiProperty({
    example: 'lecture',
    enum: ['lecture', 'assignment', 'quiz', 'resource'],
  })
  type: 'lecture' | 'assignment' | 'quiz' | 'resource';

  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'HTML Basics - Live Session' })
  title: string;

  @ApiProperty({
    example: '2026-08-06T10:00:00.000Z',
    description: 'When this material was uploaded/created',
  })
  occurredAt: Date | null;

  @ApiPropertyOptional({
    example: 'recorded',
    description: 'Only for lecture type',
    enum: ['online', 'live', 'recorded'],
    nullable: true,
  })
  lectureType?: string | null;

  @ApiPropertyOptional({
    example: 'pdf',
    description: 'Only for resource type',
    nullable: true,
  })
  resourceType?: string | null;

  @ApiProperty({ type: CourseUpdateCourseDto })
  course: CourseUpdateCourseDto;

  @ApiPropertyOptional({ type: CourseUpdateSectionDto, nullable: true })
  section: CourseUpdateSectionDto | null;
}

export class MyCourseUpdatesResponseDto {
  @ApiProperty({
    type: [CourseUpdateItemDto],
    description: 'Recent course material updates across enrolled courses',
  })
  data: CourseUpdateItemDto[];

  @ApiProperty({
    example: { returned: 20, limit: 20 },
    description: 'Result metadata',
  })
  meta: {
    returned: number;
    limit: number;
  };
}
