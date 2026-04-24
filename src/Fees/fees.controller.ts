import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { FeesService } from './fees.service';
import { FeesResponseDto } from './dto/fees-response.dto';

@ApiTags('Admin - Fees Management')
@Controller('admin/fees')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all transactions with fees summary',
    description:
      'Admin only - Get paginated list of all transactions with revenue stats, pending payments, and filtering options',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by transaction status (pending or paid)',
    example: 'paid',
  })
  @ApiQuery({
    name: 'studentName',
    required: false,
    type: String,
    description: 'Search by student name (case-insensitive)',
    example: 'Emma Thompson',
  })
  @ApiQuery({
    name: 'courseName',
    required: false,
    type: String,
    description: 'Search by course name (case-insensitive)',
    example: 'Introduction to UX Design',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter transactions from this date (format: YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter transactions until this date (format: YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Fees data retrieved successfully with stats and transactions',
    type: FeesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view fees',
  })
  async getFeesData(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('studentName') studentName?: string,
    @Query('courseName') courseName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view fees');
    }

    return this.feesService.getFeesData(
      +page,
      +limit,
      status,
      studentName,
      courseName,
      startDate,
      endDate,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get fees statistics only',
    description:
      'Admin only - Get summary statistics: total revenue, pending payments, transaction counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Fees statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can view fees',
  })
  async getFeesStats(@Request() req) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can view fees');
    }

    return this.feesService.getFeesStats();
  }

  @Patch('transactions/:transactionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update transaction status',
    description:
      'Admin only - Mark a transaction as paid or pending',
  })
  @ApiParam({
    name: 'transactionId',
    type: String,
    description: 'Transaction UUID',
    example: 'txn_1234567890',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'paid'],
          example: 'paid',
        },
      },
      required: ['status'],
    },
    description: 'New transaction status',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can update transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Transaction not found',
  })
  async updateTransactionStatus(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() body: { status: 'pending' | 'paid' },
  ) {
    // Check if user is admin
    if (req.user.role_id !== 1) {
      throw new UnauthorizedException('Only admins can update transaction status');
    }

    return this.feesService.updateTransactionStatus(transactionId, body.status);
  }
}
