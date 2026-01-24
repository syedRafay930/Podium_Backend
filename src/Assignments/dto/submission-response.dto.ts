import { ApiProperty } from '@nestjs/swagger';

export class SubmissionResponseDto {
  @ApiProperty({ description: 'Submission ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'URL of the submitted file',
    example: 'https://res.cloudinary.com/example/raw/upload/v1234567890/submission.pdf',
    required: false,
  })
  submissionFile: string | null;

  @ApiProperty({
    description: 'Submission status',
    example: 'submitted',
    enum: ['missing', 'submitted', 'graded', 'late'],
  })
  status: string | null;

  @ApiProperty({
    description: 'Date and time when the assignment was submitted',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  submittedAt: Date | null;

  @ApiProperty({
    description: 'Marks obtained (if graded)',
    example: 85,
    required: false,
  })
  marksObtained: number | null;

  @ApiProperty({
    description: 'Comments from grader',
    example: 'Good work!',
    required: false,
  })
  comments: string | null;

  @ApiProperty({
    description: 'Assignment ID',
    example: 1,
  })
  assignmentId: number;

  @ApiProperty({
    description: 'Student ID',
    example: 5,
  })
  studentId: number;
}

