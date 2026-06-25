import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class AddCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Advanced TypeScript',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  CourseName!: string;

  @ApiProperty({
    description: 'Short description of the course (max 200 characters)',
    example: 'Learn advanced TypeScript concepts and best practices',
    type: String,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  ShortDescription!: string;

  @ApiProperty({
    description: 'Course price',
    example: '99.99',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  Price!: string;

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
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  CourseCategoryId!: number;

  @ApiProperty({
    description: 'Teacher ID (optional)',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  TeacherId?: number;

  @ApiProperty({
    description: 'Languages available for the course',
    example: ['urdu', 'english'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }
    return value;
  })
  Languages!: string[];

  // Note: This field is for Swagger documentation only.
  // FileInterceptor('image') extracts the file from multipart/form-data before it reaches this DTO.
  // The actual file is received via @UploadedFile() decorator in the controller.
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Course cover image file (optional). File field name must be "image".',
    required: false,
  })
  @IsOptional()
  image?: any;
}
