import { ApiProperty } from '@nestjs/swagger';
import { ResourceListResponseDto } from 'src/Resources/dto/resource-list-response.dto';

export class UserBasicDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;
}

export class SectionResponseDto {
  @ApiProperty({ description: 'Section ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Section title', example: 'Introduction to TypeScript' })
  title: string;

  @ApiProperty({ description: 'Section description', example: 'This section covers the basics', required: false })
  description: string | null;

  @ApiProperty({ description: 'Parent section ID (null for top-level sections)', example: null, required: false })
  parentSectionId: number | null;

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

  @ApiProperty({ description: 'List of subsections', type: [SectionResponseDto], required: false })
  subsections?: SectionResponseDto[];

  @ApiProperty({ description: 'List of resources', type: [ResourceListResponseDto], required: false })
  resources?: ResourceListResponseDto[];
}

