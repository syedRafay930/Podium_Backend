import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResourceDto {
  @ApiProperty({
    description: 'Resource title',
    example: 'TypeScript Basics Video Lecture',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Resource description',
    example: 'A comprehensive video lecture covering TypeScript fundamentals',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'video',
    enum: ['video', 'pdf', 'document', 'audio', 'link', 'image'],
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['video', 'pdf', 'document', 'audio', 'link', 'image'])
  resourceType?: string;

  @ApiProperty({
    description: 'Whether this resource is available as preview',
    example: false,
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @ApiProperty({
    description: 'Whether this resource is active',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Duration in seconds (for video/audio resources)',
    example: 3600,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;
}

