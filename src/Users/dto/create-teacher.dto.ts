import {
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'Teacher first name',
    example: 'John',
    type: String,
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MaxLength(10, { message: 'First name can be at most 10 characters long' })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'Teacher last name',
    example: 'Doe',
    type: String,
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MaxLength(10, { message: 'Last name can be at most 10 characters long' })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiProperty({
    description: 'Teacher email',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail(
    {},
    { message: 'Please enter a valid email address (e.g. user@example.com)' },
  )
  @MinLength(5, { message: 'Email must be at least 5 characters long' })
  @MaxLength(100, { message: 'Email can be at most 100 characters long' })
  email: string;

  @ApiProperty({
    description: 'Teacher password (min 6 characters)',
    example: 'SecurePassword123',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Teacher contact number',
    example: '+923009876543',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactNumber?: string;

  @ApiProperty({
    description: 'Teacher status (active or inactive)',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}
