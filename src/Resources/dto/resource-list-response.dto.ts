import { ApiProperty } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;
}

export class ResourceListResponseDto {
  @ApiProperty({ description: 'Resource ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Resource title', example: 'TypeScript Basics PDF' })
  title: string;

  @ApiProperty({ description: 'Resource description', example: 'A comprehensive guide', required: false })
  description: string | null;

  @ApiProperty({ description: 'Resource type', example: 'pdf' })
  resourceType: string;

  @ApiProperty({ description: 'File URL', example: 'https://cloudinary.com/file.pdf', required: false })
  fileUrl: string | null;

  @ApiProperty({ description: 'File name', example: 'typescript-basics.pdf', required: false })
  fileName: string | null;

  @ApiProperty({ description: 'File size in bytes', example: 1048576, required: false })
  fileSize: number | null;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf', required: false })
  mimeType: string | null;

  @ApiProperty({ description: 'Duration in seconds', example: null, required: false })
  duration: number | null;

  @ApiProperty({ description: 'Is preview resource', example: false })
  isPreview: boolean | null;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean | null;

  @ApiProperty({ description: 'Course ID', example: 1, required: false })
  courseId: number | null;

  @ApiProperty({ description: 'Section ID', example: 1, required: false })
  sectionId: number | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date | null;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z', required: false })
  updatedAt: Date | null;

  @ApiProperty({ description: 'Creator information', type: UserBasicDto, required: false })
  createdBy?: UserBasicDto;

  @ApiProperty({ description: 'Updater information', type: UserBasicDto, required: false })
  updatedBy?: UserBasicDto;
}

