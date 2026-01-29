import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { GoogleCalendarService } from './google-calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventResponseDto,
  ConnectionStatusDto,
} from './dto/event-response.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Google Calendar')
@Controller('google-calendar')
@UseGuards(JwtBlacklistGuard)
@ApiBearerAuth('JWT-auth')
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate Google OAuth flow
   */
  @Get('connect')
  @ApiOperation({
    summary: 'Connect Google Calendar',
    description:
      'Teacher only - Initiate OAuth flow to connect Google Calendar account',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can connect Google Calendar',
  })
  async connect(@Request() req) {
    // Check if user is teacher (role_id = 2)
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException(
        'Only teachers can connect Google Calendar',
      );
    }

    const authUrl = this.googleCalendarService.getAuthUrl(req.user.id);
    return authUrl;
  }

  /**
   * Handle OAuth callback
   */
  @Get('callback')
  @ApiOperation({
    summary: 'OAuth Callback',
    description: 'Handles Google OAuth callback and stores credentials',
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from Google',
    required: true,
  })
  @ApiQuery({
    name: 'state',
    description: 'State parameter containing user ID',
    required: true,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend success page',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid authorization code or state',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const _result = await this.googleCalendarService.handleCallback(
        code,
        state,
      );

      // Redirect to frontend success page
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      return res.redirect(`${frontendUrl}/google-calendar/success`);
    } catch (error) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      return res.redirect(
        `${frontendUrl}/google-calendar/error?message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * Get connection status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get Connection Status',
    description: 'Teacher only - Check if Google Calendar is connected',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status retrieved successfully',
    type: ConnectionStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can check connection status',
  })
  async getStatus(@Request() req): Promise<ConnectionStatusDto> {
    // Check if user is teacher (role_id = 2)
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException(
        'Only teachers can check connection status',
      );
    }

    return this.googleCalendarService.getConnectionStatus(req.user.id);
  }

  /**
   * Disconnect Google Calendar
   */
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disconnect Google Calendar',
    description: 'Teacher only - Disconnect Google Calendar account',
  })
  @ApiResponse({
    status: 200,
    description: 'Google Calendar disconnected successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can disconnect Google Calendar',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Google account not connected',
  })
  async disconnect(@Request() req) {
    // Check if user is teacher (role_id = 2)
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException(
        'Only teachers can disconnect Google Calendar',
      );
    }

    await this.googleCalendarService.disconnect(req.user.id);
    return { message: 'Google Calendar disconnected successfully' };
  }

  /**
   * List upcoming events
   */
  @Get('events')
  @ApiOperation({
    summary: 'List Upcoming Events',
    description: 'Teacher only - Get list of upcoming calendar events',
  })
  @ApiQuery({
    name: 'maxResults',
    required: false,
    type: Number,
    description: 'Maximum number of events to return (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: [EventResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can list events',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Google account not connected',
  })
  async listEvents(
    @Request() req,
    @Query('maxResults', new ParseIntPipe({ optional: true }))
    maxResults?: number,
  ): Promise<EventResponseDto[]> {
    // Check if user is teacher (role_id = 2)
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException('Only teachers can list events');
    }

    return this.googleCalendarService.listEvents(req.user.id, maxResults || 10);
  }

  /**
   * Create event with Google Meet
   */
  @Post('events/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Event with Google Meet',
    description: 'Teacher only - Create a calendar event with Google Meet link',
  })
  @ApiBody({
    type: CreateEventDto,
    description: 'Event creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only teachers can create events',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Google account not connected',
  })
  async createEvent(
    @Request() req,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    // Check if user is teacher (role_id = 2)
    if (req.user.role_id !== 2) {
      throw new UnauthorizedException('Only teachers can create events');
    }

    return this.googleCalendarService.createEvent(req.user.id, createEventDto);
  }
}
