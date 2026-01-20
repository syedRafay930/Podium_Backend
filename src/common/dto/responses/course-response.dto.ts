import { ApiProperty } from '@nestjs/swagger';

export class CourseCategoryDto {
  @ApiProperty({ description: 'Category ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Category name', example: 'Programming', type: String, nullable: true })
  name: string | null;
}

export class TeacherDto {
  @ApiProperty({ description: 'Teacher ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'First name', example: 'Jane', type: String, nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', example: 'Smith', type: String, nullable: true })
  lastName: string | null;
}

export class AdminDto {
  @ApiProperty({ description: 'Admin ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'First name', example: 'Admin', type: String, nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', example: 'User', type: String, nullable: true })
  lastName: string | null;
}

export class LectureDto {
  @ApiProperty({ description: 'Lecture ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Lecture title', example: 'Introduction to TypeScript', type: String })
  lectureTitle: string;

  @ApiProperty({ description: 'Lecture description', example: 'Learn the basics of TypeScript', type: String, nullable: true })
  lectureDescription: string | null;

  @ApiProperty({ description: 'Lecture type', example: 'video', type: String, nullable: true })
  lectureType: string | null;

  @ApiProperty({ description: 'Video URL', example: 'https://example.com/video.mp4', type: String, nullable: true })
  videoUrl: string | null;

  @ApiProperty({ description: 'Lecture number', example: 1, type: Number, nullable: true })
  lectureNumber: number | null;
}

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Course name', example: 'Advanced TypeScript', type: String })
  courseName: string;

  @ApiProperty({ description: 'Short description', example: 'Learn advanced TypeScript concepts', type: String, nullable: true })
  shortDescription: string | null;

  @ApiProperty({ description: 'Price', example: '99.99', type: String, nullable: true })
  price: string | null;

  @ApiProperty({ description: 'Long description', example: 'Comprehensive course on advanced TypeScript...', type: String, nullable: true })
  longDescription: string | null;

  @ApiProperty({ description: 'Cover image URL', example: 'https://example.com/image.jpg', type: String, nullable: true })
  coverImg: string | null;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z', type: Date, nullable: true })
  createdAt: Date | null;

  @ApiProperty({ description: 'Course category', type: CourseCategoryDto })
  courseCategory: CourseCategoryDto;

  @ApiProperty({ description: 'Teacher information', type: TeacherDto, nullable: true })
  teacher: TeacherDto | null;

  @ApiProperty({ description: 'Admin who created the course', type: AdminDto })
  createdBy: AdminDto;

  @ApiProperty({ description: 'List of lectures', type: [LectureDto], nullable: true })
  lectures?: LectureDto[];

  @ApiProperty({ description: 'Number of ratings', example: 10, type: Number })
  ratingCount?: number;

  @ApiProperty({ description: 'Average rating', example: 4.5, type: Number })
  averageRating?: number;

  @ApiProperty({ description: 'Lecture statistics by type', example: { video: 5, live: 3 }, type: Object })
  lectureStats?: Record<string, number>;
}

