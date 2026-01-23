import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditEnrollCourseDto {
  @ApiProperty({
    description: 'Course ID to enroll in',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  courseId: number;

  @ApiProperty({
    description: 'Student ID (only used when admin enrolls a student). For students, this is ignored and uses the authenticated user ID.',
    example: 5,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  studentId?: number;

  @ApiProperty({
    description: 'Enrollment status',
    example: 'enrolled',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

}
