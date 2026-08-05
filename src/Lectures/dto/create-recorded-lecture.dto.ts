import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
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
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({
    example: 1,
    description: 'Section ID',
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lecture order/sequence in section',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lectureOrder?: number;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Duration of lecture in seconds',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    example: 'https://example.com/videos/intro-to-databases.mp4',
    description: 'External video URL to store for this recorded lecture',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
