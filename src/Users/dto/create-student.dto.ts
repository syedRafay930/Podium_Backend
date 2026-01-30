import {
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({
    description: 'Student first name',
    example: 'Ahmed',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    description: 'Student last name',
    example: 'Khan',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  lastName: string;

  @ApiProperty({
    description: 'Student email',
    example: 'ahmed.khan@example.com',
    type: String,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Student contact number',
    example: '+923001234567',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
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
