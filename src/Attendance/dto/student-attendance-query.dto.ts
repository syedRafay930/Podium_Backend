import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class StudentAttendanceQueryDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'Filter attendance by enrolled course ID',
  })
  @IsOptional()
  @IsNumberString()
  courseId?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Filter attendance by lecture ID (typically used with courseId)',
  })
  @IsOptional()
  @IsNumberString()
  lectureId?: string;
}
