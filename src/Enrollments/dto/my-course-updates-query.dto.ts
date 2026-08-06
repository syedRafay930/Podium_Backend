import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class MyCourseUpdatesQueryDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Max number of updates to return (default 20, max 50)',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Optional filter by enrolled course ID',
  })
  @IsOptional()
  @IsNumberString()
  courseId?: string;

  @ApiPropertyOptional({
    example: 'lecture,assignment,quiz,resource',
    description:
      'Comma-separated material types to include. Allowed: lecture, assignment, quiz, resource. Default: all.',
  })
  @IsOptional()
  @IsString()
  types?: string;
}
