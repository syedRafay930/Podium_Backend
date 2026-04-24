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

export class CreateStudentDto {
  @ApiProperty({
    description: 'Student first name',
    example: 'Ahmed',
    type: String,
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MinLength(3, { message: 'First name must be at least 3 characters long' })
  @MaxLength(50, { message: 'First name can be at most 50 characters long' })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'Student last name',
    example: 'Khan',
    type: String,
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MinLength(3, { message: 'Last name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Last name can be at most 50 characters long' })
  @Matches(/^[A-Za-z\s'-]+$/, {
    message:
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiProperty({
    description: 'Student email',
    example: 'ahmed.khan@example.com',
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
    description: 'Student contact number',
    example: '+923001234567',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{11,13}$/, {
    message:
      'Contact number must be digits only and can start with + for country code (e.g., +923001234567)',
  })
  contactNumber?: string;

  @ApiProperty({
    description: 'Student password',
    example: 'securePassword123',
    type: String,
    minLength: 6,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
