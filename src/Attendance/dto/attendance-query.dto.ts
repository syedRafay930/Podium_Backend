import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class AttendanceQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Lecture ID filter',
  })
  @IsOptional()
  @IsNumberString()
  lectureId?: string;

  @ApiPropertyOptional({
    example: '2026-01-27',
    description: 'Attendance date filter',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
