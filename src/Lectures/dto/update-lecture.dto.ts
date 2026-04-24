import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLectureDto {
  @ApiPropertyOptional({
    example: 'Updated Lecture Title',
    description: 'Lecture title',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'Lecture description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Lecture order/sequence in section',
  })
  @IsNumber()
  @IsOptional()
  lectureOrder?: number;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Duration of lecture in seconds (for recorded lectures)',
  })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Soft delete flag',
  })
  @IsBoolean()
  @IsOptional()
  isDelete?: boolean;
}
