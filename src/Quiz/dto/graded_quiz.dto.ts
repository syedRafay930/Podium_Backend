import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsBoolean, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeQuestionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  question_id: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  marks_obtained: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_correct: boolean;
}

export class GradeQuizDto {
  @ApiProperty({ example: 'Well done, keep it up!' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ type: [GradeQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeQuestionDto)
  questions: GradeQuestionDto[];
}