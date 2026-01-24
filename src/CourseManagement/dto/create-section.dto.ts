import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({
    description: 'Section title',
    example: 'Introduction to TypeScript',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

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

