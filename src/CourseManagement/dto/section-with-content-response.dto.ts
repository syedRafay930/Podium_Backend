import { ApiProperty } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;
}

export class AssignmentMaterialDto {
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

export class AssignmentDto {
  @ApiProperty({ description: 'Assignment ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Assignment title', example: 'Week 1 Assignment' })
  title: string;

  @ApiProperty({ description: 'Assignment objective', example: 'Learn TypeScript basics', required: false })
  objective: string | null;

  @ApiProperty({ description: 'Deliverable details', example: 'Submit a TypeScript file', required: false })
  deliverable: string | null;

  @ApiProperty({ description: 'Format requirements', example: 'PDF format', required: false })
  format: string | null;

  @ApiProperty({ description: 'Total marks', example: 100, required: false })
  totalMarks: number | null;

  @ApiProperty({ description: 'Due date', example: '2024-12-31T23:59:59Z', required: false })
  dueDate: Date | null;

  @ApiProperty({ description: 'Assignment description', example: 'This is a test', required: false })
  description: string | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({
    description: 'Assignment materials (files)',
    type: [AssignmentMaterialDto],
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
  materials?: AssignmentMaterialDto[];

  @ApiProperty({ description: 'Creator information', type: UserBasicDto, required: false })
  createdBy?: UserBasicDto;
}

export class LectureDto {
  @ApiProperty({ description: 'Lecture ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Lecture title', example: 'TypeScript Basics' })
  title: string;

  @ApiProperty({ description: 'Lecture description', example: 'Learn the basics', required: false })
  description: string | null;

  @ApiProperty({ description: 'Lecture type', example: 'video' })
  lectureType: string;

  @ApiProperty({ description: 'Video URL', example: 'https://example.com/video.mp4', required: false })
  videoUrl: string | null;

  @ApiProperty({ description: 'Duration in minutes', example: 45, required: false })
  duration: number | null;

  @ApiProperty({ description: 'Live session start time', example: '2024-12-31T14:00:00Z', required: false })
  liveStart: Date | null;

  @ApiProperty({ description: 'Meeting link for live lecture', example: 'https://meet.google.com/xyz', required: false })
  meetingLink: string | null;

  @ApiProperty({ description: 'Lecture order in section', example: 1, required: false })
  lectureOrder: number | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z', required: false })
  updatedAt: Date | null;

  @ApiProperty({ description: 'Creator information', type: UserBasicDto, required: false })
  createdBy?: UserBasicDto;
}

export class ResourceDto {
  @ApiProperty({ description: 'Resource ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Resource title', example: 'Learning Guide' })
  title: string;

  @ApiProperty({ description: 'Resource description', example: 'A comprehensive guide', required: false })
  description: string | null;

  @ApiProperty({ description: 'Resource type', example: 'pdf' })
  resourceType: string;

  @ApiProperty({ description: 'File URL', example: 'https://example.com/file.pdf', required: false })
  fileUrl: string | null;

  @ApiProperty({ description: 'Original file name', example: 'guide.pdf', required: false })
  fileName: string | null;

  @ApiProperty({ description: 'File size in bytes', example: 1024000, required: false })
  fileSize: number | null;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf', required: false })
  mimeType: string | null;

  @ApiProperty({ description: 'Duration for video resources', example: 45, required: false })
  duration: number | null;

  @ApiProperty({ description: 'Is preview resource', example: false, required: false })
  isPreview: boolean | null;

  @ApiProperty({ description: 'Is active', example: true, required: false })
  isActive: boolean | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z', required: false })
  updatedAt: Date | null;

  @ApiProperty({ description: 'Creator information', type: UserBasicDto, required: false })
  createdBy?: UserBasicDto;
}

export class SectionWithContentResponseDto {
  @ApiProperty({ description: 'Section ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Section title', example: 'Introduction to TypeScript' })
  title: string;

  @ApiProperty({ description: 'Section description', example: 'This section covers the basics', required: false })
  description: string | null;

  @ApiProperty({ description: 'Course ID', example: 1, required: false })
  courseId: number | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z', required: false })
  updatedAt: Date | null;

  @ApiProperty({ description: 'Creator information', type: UserBasicDto, required: false })
  createdBy?: UserBasicDto;

  @ApiProperty({ description: 'Updater information', type: UserBasicDto, required: false })
  updatedBy?: UserBasicDto;

  @ApiProperty({ description: 'Assignments in this section', type: [AssignmentDto] })
  assignments: AssignmentDto[];

  @ApiProperty({ description: 'Lectures in this section', type: [LectureDto] })
  lectures: LectureDto[];

  @ApiProperty({ description: 'Resources in this section', type: [ResourceDto] })
  resources: ResourceDto[];
}
