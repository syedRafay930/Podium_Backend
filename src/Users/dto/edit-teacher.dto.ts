import {
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditTeacherDto {
  @ApiProperty({
    description: 'Teacher first name',
    example: 'John',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiProperty({
    description: 'Teacher last name',
    example: 'Doe',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiProperty({
    description: 'Teacher email',
    example: 'john.doe@example.com',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Teacher password (min 6 characters)',
    example: 'NewPassword123',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

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
  @IsBoolean()
  isActive?: boolean;
}
