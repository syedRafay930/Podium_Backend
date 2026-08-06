import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class MyEnrollmentRequestsQueryDto {
  @ApiPropertyOptional({
    example: 'pending',
    description:
      'Optional filter by enrollment status. Omit to return all of the student\'s enrollment requests.',
    enum: ['pending', 'enrolled', 'rejected', 'dismissed'],
  })
  @IsOptional()
  @IsIn(['pending', 'enrolled', 'rejected', 'dismissed'])
  status?: 'pending' | 'enrolled' | 'rejected' | 'dismissed';
}
