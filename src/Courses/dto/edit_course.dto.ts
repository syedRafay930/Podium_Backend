import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Advanced TypeScript',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  CourseName?: string;

  @ApiProperty({
    description: 'Short description of the course (max 200 characters)',
    example: 'Learn advanced TypeScript concepts and best practices',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ShortDescription?: string;

  @ApiProperty({
    description: 'Course price',
    example: '99.99',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  Price?: string;

  @ApiProperty({
    description: 'Long description of the course',
    example: 'This comprehensive course covers advanced TypeScript features...',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  LongDescription?: string;

  @ApiProperty({
    description: 'Course category ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  CourseCategoryId?: number;

  @ApiProperty({
    description: 'Teacher ID (optional)',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  TeacherId?: number;

  @ApiProperty({
    description: 'Languages available for the course',
    example: ['urdu', 'english'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  Languages?: string[];

  // Note: This field is for Swagger documentation only.
  // FileInterceptor('image') extracts the file from multipart/form-data before it reaches this DTO.
  // The actual file is received via @UploadedFile() decorator in the controller.
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'Course cover image file (optional). File field name must be "image".',
    required: false,
  })
  image?: any;

  @ApiProperty({
    description: 'Course active status',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
