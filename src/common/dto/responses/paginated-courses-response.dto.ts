import { ApiProperty } from '@nestjs/swagger';
import { CourseResponseDto } from './course-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100, type: Number })
  totalItems: number;

  @ApiProperty({ description: 'Number of items in current page', example: 10, type: Number })
  itemCount: number;

  @ApiProperty({ description: 'Items per page', example: 10, type: Number })
  itemsPerPage: number;

  @ApiProperty({ description: 'Total number of pages', example: 10, type: Number })
  totalPages: number;

  @ApiProperty({ description: 'Current page number', example: 1, type: Number })
  currentPage: number;
}

export class CourseListItemDto {
  @ApiProperty({ description: 'Course ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Course name', example: 'Advanced TypeScript', type: String })
  courseName: string;

  @ApiProperty({ description: 'Short description', example: 'Learn advanced TypeScript concepts', type: String, nullable: true })
  shortDescription: string | null;

  @ApiProperty({ description: 'Price', example: '99.99', type: String, nullable: true })
  price: string | null;

  @ApiProperty({ description: 'Cover image URL', example: 'https://example.com/image.jpg', type: String, nullable: true })
  coverImg: string | null;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z', type: Date, nullable: true })
  createdAt: Date | null;

  @ApiProperty({ description: 'Average rating', example: 4.5, type: Number })
  avgRating: number;

  @ApiProperty({ description: 'Course category ID', example: 1, type: Number })
  courseCategory?: { id: number; name: string | null };

  @ApiProperty({ description: 'Teacher information', type: Object, nullable: true })
  teacher?: { id: number; firstName: string | null; lastName: string | null } | null;

  @ApiProperty({ description: 'Admin who created the course', type: Object })
  createdBy?: { id: number; firstName: string | null; lastName: string | null };
}

export class PaginatedCoursesResponseDto {
  @ApiProperty({
    description: 'List of courses',
    type: [CourseListItemDto],
  })
  data: CourseListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

