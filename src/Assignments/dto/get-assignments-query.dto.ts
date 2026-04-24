import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentSubmissionStatus } from './assignment-status.enum';

export class GetAssignmentsQueryDto {
  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    type: Number,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by course ID',
    example: 1,
    type: Number,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  courseId?: number;

  @ApiProperty({
    description: 'Filter by assignment submission status',
    example: 'missing',
    enum: AssignmentSubmissionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssignmentSubmissionStatus)
  status?: AssignmentSubmissionStatus;
}

