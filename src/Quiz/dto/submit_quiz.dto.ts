import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StudentAnswerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  question_id: number;

  @ApiProperty({ example: [101, 102], description: 'Array of selected option IDs', required: false })
  @IsOptional()
  @IsArray()
  selected_option_ids?: number[];

  @ApiProperty({ example: 'This is my text answer', required: false })
  @IsOptional()
  @IsString()
  text_answer?: string;
}

export class SubmitQuizDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  quiz_id: number;

  @ApiProperty({ type: [StudentAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerDto)
  answers: StudentAnswerDto[];
}