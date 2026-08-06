import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class TeacherAssignmentActionDto {
  @ApiProperty({
    example: 'accept',
    enum: ['accept', 'reject'],
    description: 'Teacher action on the course assignment',
  })
  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';
}
