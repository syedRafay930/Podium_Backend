import { ApiProperty } from '@nestjs/swagger';
import { ModuleDto } from './module-response.dto';

export class UserDto {
  @ApiProperty({ description: 'User ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John', type: String, nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', example: 'Doe', type: String, nullable: true })
  lastName: string | null;

  @ApiProperty({ description: 'Email address', example: 'user@example.com', type: String })
  email: string;

  @ApiProperty({ description: 'Account active status', example: true, type: Boolean, nullable: true })
  isActive: boolean | null;

  @ApiProperty({ description: 'Account deleted status', example: false, type: Boolean, nullable: true })
  isDelete: boolean | null;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Login successful',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: 'Sidebar modules based on user role permissions',
    type: [ModuleDto],
    example: [
      {
        id: 1,
        name: 'Dashboard',
        is_enable: true,
        children: [
          {
            id: 2,
            name: 'Sub Module',
            is_enable: true
          }
        ]
      }
    ]
  })
  sidebar: ModuleDto[];
}

