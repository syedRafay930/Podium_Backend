import { ApiProperty } from '@nestjs/swagger';

export class AssignmentMaterialBasicDto {
  @ApiProperty({ description: 'Material ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'File URL', example: 'https://example.com/assignment.pdf' })
  fileUrl: string;

  @ApiProperty({ description: 'File name', example: 'assignment.pdf', required: false })
  fileName: string | null;

  @ApiProperty({ description: 'File size in bytes', example: 1024000, required: false })
  fileSize: number | null;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf', required: false })
  fileType: string | null;
}

export class CourseBasicDto {
  @ApiProperty({ description: 'Course ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Course name', example: 'Advanced TypeScript' })
  courseName: string;
}

export class UserBasicDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;
}

export class AssignmentResponseDto {
  @ApiProperty({ description: 'Assignment ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Assignment title', example: 'Introduction to TypeScript' })
  title: string;

  @ApiProperty({ description: 'Assignment objective', example: 'Learn basic TypeScript', required: false })
  objective: string | null;

  @ApiProperty({ description: 'Assignment deliverable', example: 'Submit a TypeScript project', required: false })
  deliverable: string | null;

  @ApiProperty({ description: 'Assignment format', example: 'PDF format', required: false })
  format: string | null;

  @ApiProperty({ description: 'Total marks', example: 100, required: false })
  totalMarks: number | null;

  @ApiProperty({ description: 'Due date', example: '2024-12-31T23:59:59Z', required: false })
  dueDate: Date | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({
    description: 'Assignment materials (files)',
    type: [Object],
    required: false,
    example: [
      {
        id: 1,
        fileUrl: 'https://example.com/assignment.pdf',
        fileName: 'assignment.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
      },
    ],
  })
  materials?: AssignmentMaterialBasicDto[];

  @ApiProperty({ description: 'Course information', type: CourseBasicDto })
  course: CourseBasicDto;

  @ApiProperty({ description: 'Creator information', type: UserBasicDto })
  createdBy: UserBasicDto;
}

