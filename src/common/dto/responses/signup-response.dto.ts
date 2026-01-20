import { ApiProperty } from '@nestjs/swagger';

export class SignUpUserDto {
  @ApiProperty({ description: 'User ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John', type: String, nullable: true })
  first_name: string;

  @ApiProperty({ description: 'Last name', example: 'Doe', type: String, nullable: true })
  last_name: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com', type: String })
  email: string;

  @ApiProperty({ description: 'Date of birth', example: '1990-01-01', type: String, nullable: true })
  date_of_birth: string | null;

  @ApiProperty({ description: 'Gender', example: 'Male', type: String, nullable: true })
  gender: string | null;
}

export class SignUpResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User registered successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Created user information',
    type: SignUpUserDto,
  })
  user: SignUpUserDto;
}

