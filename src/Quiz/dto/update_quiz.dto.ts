import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsArray, ValidateNested, IsString, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOptionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  option_text?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ example: 'Updated question text?' })
  @IsOptional()
  @IsString()
  question_text?: string;

  @ApiPropertyOptional({ enum: ['MCQ', 'BCQ', 'SHORT'] })
  @IsOptional()
  @IsEnum(['MCQ', 'BCQ', 'SHORT'])
  question_type?: 'MCQ' | 'BCQ' | 'SHORT';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  marks?: number;

  @ApiProperty({ type: [UpdateOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOptionDto)
  options?: UpdateOptionDto[];
}

export class UpdateQuizDto {
  // Main Quiz fields
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() total_marks?: number;
  @IsOptional() @IsDateString() start_time?: Date;
  @IsOptional() @IsDateString() end_time?: Date;
  @IsOptional() @IsBoolean() is_Published?: boolean;

  @ApiProperty({ type: [UpdateQuestionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionDto)
  questions?: UpdateQuestionDto[];
}