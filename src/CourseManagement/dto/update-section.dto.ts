import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSectionDto {
  @ApiProperty({
    description: 'Section title',
    example: 'Introduction to TypeScript',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Section description',
    example: 'This section covers the basics of TypeScript programming',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

