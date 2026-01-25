import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

export class LectureResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Introduction to Databases' })
  title: string;

  @ApiPropertyOptional({ example: 'Learn the basics...' })
  description: string | null;

  @ApiProperty({ example: 'recorded' })
  lectureType: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/video.mp4' })
  videoUrl: string | null;

  @ApiPropertyOptional({ example: 3600 })
  duration: number | null;

  @ApiPropertyOptional({ example: '2026-02-15T14:30:00Z' })
  liveStart: Date | null;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-def-ghi' })
  meetingLink: string | null;

  @ApiPropertyOptional({ example: 1 })
  lectureOrder: number | null;

  @ApiProperty({ example: false })
  isDelete: boolean | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date | null;

  @ApiPropertyOptional({ example: '2024-01-20T15:45:00Z' })
  updatedAt: Date | null;

  @ApiProperty({ type: UserBasicDto })
  createdBy: UserBasicDto;

  @ApiPropertyOptional({ type: UserBasicDto })
  updatedBy: UserBasicDto | null;

  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ example: 1 })
  sectionId: number;
}

export class LectureListResponseDto {
  @ApiProperty({ type: [LectureResponseDto] })
  lectures: LectureResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ example: 1 })
  sectionId: number;
}
