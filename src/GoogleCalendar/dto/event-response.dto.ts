import { ApiProperty } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({
    description: 'Event ID from Google Calendar',
    example: 'abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Event title/summary',
    example: 'Math Tutoring Session',
  })
  summary: string;

  @ApiProperty({
    description: 'Event description',
    example: 'One-on-one tutoring session',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601 format)',
    example: '2024-12-25T10:00:00-05:00',
  })
  start: string;

  @ApiProperty({
    description: 'Event end date and time (ISO 8601 format)',
    example: '2024-12-25T11:00:00-05:00',
  })
  end: string;

  @ApiProperty({
    description: 'Google Meet link (if available)',
    example: 'https://meet.google.com/abc-defg-hij',
    required: false,
  })
  meetLink?: string;

  @ApiProperty({
    description: 'Event HTML link',
    example: 'https://www.google.com/calendar/event?eid=abc123',
  })
  htmlLink: string;
}

export class ConnectionStatusDto {
  @ApiProperty({
    description: 'Whether Google account is connected',
    example: true,
  })
  connected: boolean;

  @ApiProperty({
    description: 'Google email address (if connected)',
    example: 'teacher@example.com',
    required: false,
  })
  googleEmail?: string;
}

