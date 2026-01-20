import { IsDate, IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    description: 'First name',
    example: 'John',
    type: String,
  })
  @IsString()
  first_name: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    type: String,
  })
  @IsString()
  last_name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePassword123!',
    type: String,
    minLength: 1,
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Date of birth',
    example: '1990-01-01T00:00:00.000Z',
    type: Date,
  })
  @IsDate()
  date_of_birth: Date;

  @ApiProperty({
    description: 'Gender',
    example: 'Male',
    type: String,
  })
  @IsString()
  gender: string;
}
