import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionDto {
  @ApiProperty({ example: 'Paris' })
  @IsString()
  option_text: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_correct: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  @IsString()
  question_text: string;

  @ApiProperty({ enum: ['MCQ', 'BCQ', 'SHORT'], example: 'MCQ' })
  @IsEnum(['MCQ', 'BCQ', 'SHORT'])
  question_type: 'MCQ' | 'BCQ' | 'SHORT';

  @ApiProperty({ example: 5 })
  @IsInt()
  marks: number;

  @ApiProperty({ type: [CreateOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}

export class CreateQuizDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  course_id: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  section_id?: number;

  @ApiProperty({ example: 'General Knowledge Quiz' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'This quiz covers basic geography.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 }) // Logged in teacher ID
  @IsInt()
  created_by: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  total_marks: number;

  @ApiProperty({ example: '2026-02-01T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  start_time: Date;

  @ApiProperty({ example: '2026-02-01T11:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  end_time: Date;

  @ApiProperty({ example: 'if teacher wants to publish the quiz so students can access it' })
  @IsBoolean()
  is_Published: boolean;

  @ApiProperty({ type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
