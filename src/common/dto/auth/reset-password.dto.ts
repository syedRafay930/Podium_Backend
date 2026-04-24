import { IsString, IsNotEmpty, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password (must be at least 8 characters with uppercase, lowercase, number, and special character)',
    example: 'NewSecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
    }
  )
  newPassword: string;
}

