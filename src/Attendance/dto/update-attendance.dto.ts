import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsDateString } from 'class-validator';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    example: '2026-01-28',
    description: 'Update attendance date',
  })
  @IsOptional()
  @IsDateString()
  attendanceDate?: string;

  @ApiPropertyOptional({
    example: [1, 3, 6],
    description: 'Updated present student IDs',
  })
  @IsOptional()
  @IsArray()
  presentStudentIds?: number[];

  @ApiPropertyOptional({
    example: [2, 4],
    description: 'Updated absent student IDs',
  })
  @IsOptional()
  @IsArray()
  absentStudentIds?: number[];
}
