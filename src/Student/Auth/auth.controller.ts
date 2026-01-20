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
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/common/dto/auth/login.dto';
import { ForgotPasswordDto } from 'src/common/dto/auth/forgot-password.dto';
import { ResetPasswordDto } from 'src/common/dto/auth/reset-password.dto';
import { SignUpDto } from './dto/sign_up.dto';
import { StdJwtBlacklistGuard } from './guards/jwt.guard';
import { LoginResponseDto } from 'src/common/dto/responses/login-response.dto';
import { MessageResponseDto } from 'src/common/dto/responses/message-response.dto';
import { SignUpResponseDto } from 'src/common/dto/responses/signup-response.dto';

//import { RBACService } from '../RBAC/rbac.service';
//import { FirebaseService } from 'src/firebase/firebase.service';

@ApiTags('Student Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    //private readonly rbacService: RBACService,
    //private readonly firebaseService: FirebaseService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student login', description: 'Authenticate student user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
    //const sidebar = await this.rbacService.getModulesByRole(user.role.id);
    return {
      message: 'Login successful',
      access_token: token,
      user,
      //sidebar,
    };
  }

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Student registration', description: 'Register a new student account' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: SignUpResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Email already in use' })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset', description: 'Send password reset link to student email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent to email',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    return this.authService.forgotPassword(email);
  }

  @Patch('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password', description: 'Reset student password using token from email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(StdJwtBlacklistGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Student logout', description: 'Logout student user and blacklist token' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    await this.authService.logout(token);
    return { message: 'Logout successful' };
  }
}
