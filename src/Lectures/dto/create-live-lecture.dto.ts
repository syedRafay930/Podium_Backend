import { IsString, IsNumber, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLiveLectureDto {
  @ApiProperty({
    example: 'Live Discussion on Database Optimization',
    description: 'Lecture title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Real-time Q&A session about database performance tuning',
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

  @ApiProperty({
    example: '2026-02-15T14:30:00Z',
    description: 'Live lecture start date and time',
  })
  @IsDateString()
  @IsNotEmpty()
  liveStart: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lecture order/sequence in section',
  })
  @IsNumber()
  @IsOptional()
  lectureOrder?: number;

  // Note: meetingLink will be generated from Google Calendar
  // lectureType will be set to 'live' automatically
}
