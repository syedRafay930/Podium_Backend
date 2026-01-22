import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({
    description: 'Assignment title',
    example: 'Introduction to TypeScript',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Assignment objective',
    example: 'Learn basic TypeScript concepts',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  objective?: string;

  @ApiProperty({
    description: 'Assignment deliverable description',
    example: 'Submit a TypeScript project with proper types',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  deliverable?: string;

  @ApiProperty({
    description: 'Assignment format requirements',
    example: 'PDF format, max 10 pages',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiProperty({
    description: 'Total marks for the assignment',
    example: 100,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalMarks?: number;

  @ApiProperty({
    description: 'Due date for the assignment',
    example: '2024-12-31T23:59:59Z',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'File URL for assignment materials',
    example: 'https://example.com/assignment.pdf',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @ApiProperty({
    description: 'Course ID for the assignment',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}

