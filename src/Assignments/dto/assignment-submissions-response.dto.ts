import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/dto/responses/paginated-courses-response.dto';

export class StudentSubmissionDto {
  @ApiProperty({ description: 'Student ID', example: 5 })
  studentId: number;

  @ApiProperty({ description: 'Student first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Student last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Student email', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({
    description: 'Date and time when the assignment was submitted',
    example: '2024-01-15T10:30:00Z',
    required: false,
    nullable: true,
  })
  submittedAt: Date | null;

  @ApiProperty({
    description: 'Array of submitted file URLs',
    example: ['https://res.cloudinary.com/example/raw/upload/v1234567890/submission.pdf'],
    type: [String],
    required: false,
  })
  submissionFiles: string[];

  @ApiProperty({
    description: 'Submission status',
    example: 'submitted',
    enum: ['missing', 'submitted', 'graded', 'late'],
  })
  status: string;
}

export class PaginatedSubmissionsResponseDto {
  @ApiProperty({
    description: 'List of student submissions',
    type: [StudentSubmissionDto],
  })
  data: StudentSubmissionDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

