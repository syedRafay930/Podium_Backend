import { ApiProperty } from '@nestjs/swagger';
import { ResourceListResponseDto } from './resource-list-response.dto';

export class CourseResourcesResponseDto {
  @ApiProperty({ description: 'Course ID', example: 1 })
  courseId: number;

  @ApiProperty({ description: 'Course name', example: 'Introduction to TypeScript' })
  courseName: string;

  @ApiProperty({ description: 'List of resources for this course', type: [ResourceListResponseDto] })
  resources: ResourceListResponseDto[];
}

