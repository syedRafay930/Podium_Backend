import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'user@example.com',
    type: String,
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
}
