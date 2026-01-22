import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollCourseDto {
  @ApiProperty({
    description: 'Course ID to enroll in',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
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
    description: 'Payment status (only for admin role). Must be "pending" or "paid". Defaults to "paid" if not provided. Ignored for student self-enrollment.',
    example: 'paid',
    enum: ['pending', 'paid'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'paid'], {
    message: 'paymentStatus must be either "pending" or "paid"',
  })
  paymentStatus?: 'pending' | 'paid';
}
