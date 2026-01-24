import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({
    description: 'Marks obtained by the student',
    example: 85,
    type: Number,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marksObtained?: number;

  @ApiProperty({
    description: 'Comments from the grader',
    example: 'Excellent work! Well done on the implementation.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

