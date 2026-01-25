import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Event title/summary',
    example: 'Math Tutoring Session',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601 format)',
    example: '2024-12-25T10:00:00',
    type: String,
  })
  @IsNotEmpty()
  @IsDateString()
  startDateTime: string;

  @ApiProperty({
    description: 'Event duration in minutes',
    example: 60,
    type: Number,
    minimum: 15,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({
    description: 'Event description (optional)',
    example: 'One-on-one tutoring session',
    type: String,
    required: false,
  })
  @IsString()
  description?: string;
}

