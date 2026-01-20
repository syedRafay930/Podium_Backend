import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Advanced TypeScript',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  CourseName: string;

  @ApiProperty({
    description: 'Short description of the course (max 200 characters)',
    example: 'Learn advanced TypeScript concepts and best practices',
    type: String,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  ShortDescription: string;

  @ApiProperty({
    description: 'Course price',
    example: '99.99',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  Price: string;

  @ApiProperty({
    description: 'Long description of the course',
    example: 'This comprehensive course covers advanced TypeScript features...',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  LongDescription: string;

  @ApiProperty({
    description: 'Course category ID',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  CourseCategoryId: number;

  @ApiProperty({
    description: 'Teacher ID (optional)',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  TeacherId: number;

  @ApiProperty({
    description: 'Course cover image URL',
    example: 'https://example.com/course-cover.jpg',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  CoverImg: string;

}
