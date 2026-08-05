import { ApiProperty } from '@nestjs/swagger';

export class ProgressCountDto {
  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 3 })
  completed: number;
}

export class CourseProgressResponseDto {
  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ type: ProgressCountDto })
  lectures: ProgressCountDto;

  @ApiProperty({ type: ProgressCountDto })
  assignments: ProgressCountDto;

  @ApiProperty({ type: ProgressCountDto })
  quizzes: ProgressCountDto;

  @ApiProperty({ type: ProgressCountDto })
  overall: ProgressCountDto;
}
