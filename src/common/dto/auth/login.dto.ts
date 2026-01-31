import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail(
    {},
    {
      message: (args) => {
        if (!args.value || args.value.trim() === '') {
          return 'Email is required';
        }
        return 'Please enter a valid email address (e.g. user@example.com)';
      },
    },
  )
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  password: string;
}
