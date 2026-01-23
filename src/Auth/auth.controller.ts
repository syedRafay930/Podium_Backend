import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/common/dto/auth/login.dto';
import { ForgotPasswordDto } from 'src/common/dto/auth/forgot-password.dto';
import { ResetPasswordDto } from 'src/common/dto/auth/reset-password.dto';
import { JwtBlacklistGuard } from './guards/jwt.guards';
import { LoginResponseDto } from 'src/common/dto/responses/login-response.dto';
import { MessageResponseDto } from 'src/common/dto/responses/message-response.dto';

import { RBACService } from '../RBAC/rbac.service';
//import { FirebaseService } from 'src/firebase/firebase.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RBACService,
    //private readonly firebaseService: FirebaseService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/json')
  @ApiOperation({ 
    summary: 'User login', 
    description: 'Authenticate user with email and password. Returns JWT token, user information, and sidebar modules based on role permissions.' 
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'User credentials for authentication',
    examples: {
      example1: {
        value: {
          email: 'qureshisadaan01@gmail.com',
          password: 'sadaanqureshi'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT token, user data, and sidebar modules',
    type: LoginResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Email and password are required' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid email or password' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await this.authService.validateUserByEmail(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const token = await this.authService.generateJwtToken(user);
    const sidebar = await this.rbacService.getModulesByRole(user.role.id);
    return {
      message: 'Login successful',
      access_token: token,
      user,
      sidebar,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/json')
  @ApiOperation({ 
    summary: 'Request password reset', 
    description: 'Send password reset link to user email address. The reset token will be sent via email.' 
  })
  @ApiBody({ 
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
    examples: {
      example1: {
        value: {
          email: 'user@example.com'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent successfully to email',
    type: MessageResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid email format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found with the provided email' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error - Failed to send email' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    return this.authService.forgotPassword(email);
  }

  @Patch('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/json')
  @ApiOperation({ 
    summary: 'Reset password', 
    description: 'Reset user password using the token received via email. The new password must meet security requirements (min 8 characters with uppercase, lowercase, number, and special character).' 
  })
  @ApiBody({ 
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    examples: {
      example1: {
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          newPassword: 'NewSecurePassword123!'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid password format or missing fields' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or expired reset token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(JwtBlacklistGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('application/json')
  @ApiOperation({ 
    summary: 'User logout', 
    description: 'Logout user and blacklist the JWT token. The token will be invalidated and cannot be used for subsequent requests.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful - Token has been blacklisted',
    type: MessageResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    await this.authService.logout(token);
    return { message: 'Logout successful' };
  }
}
