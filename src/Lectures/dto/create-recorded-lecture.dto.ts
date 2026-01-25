import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecordedLectureDto {
  @ApiProperty({
    example: 'Introduction to Databases',
    description: 'Lecture title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Learn the basics of database design and structure',
    description: 'Lecture description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1,
    description: 'Course ID',
  })
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({
    example: 1,
    description: 'Section ID',
  })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lecture order/sequence in section',
  })
  @IsNumber()
  @IsOptional()
  lectureOrder?: number;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Duration of lecture in seconds',
  })
  @IsNumber()
  @IsOptional()
  duration?: number;

  // Note: videoUrl will be populated from file upload to Cloudinary
  // lectureType will be set to 'recorded' automatically
}
