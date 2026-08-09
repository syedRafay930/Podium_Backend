import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MarksheetStudentDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  lastName: string;

  @ApiProperty({ example: 'ali@example.com' })
  email: string;
}

class MarksheetCourseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Introduction to Web Development' })
  courseName: string;

  @ApiPropertyOptional({ nullable: true })
  coverImg: string | null;

  @ApiPropertyOptional({ example: '99.99', nullable: true })
  price: string | null;
}

class MarksheetCategorySummaryDto {
  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 3 })
  graded: number;

  @ApiProperty({ example: 1 })
  submitted: number;

  @ApiProperty({ example: 1 })
  missing: number;

  @ApiProperty({ example: 240, description: 'Sum of marks obtained on graded items' })
  obtainedMarks: number;

  @ApiProperty({
    example: 300,
    description: 'Sum of totalMarks for graded items only (fair % base)',
  })
  gradedTotalMarks: number;

  @ApiProperty({
    example: 500,
    description: 'Sum of totalMarks across all items in this category',
  })
  possibleTotalMarks: number;

  @ApiPropertyOptional({
    example: 80,
    nullable: true,
    description: 'obtainedMarks / gradedTotalMarks * 100 when gradedTotalMarks > 0',
  })
  percentage: number | null;
}

class MarksheetOverallSummaryDto {
  @ApiProperty({ example: 350 })
  obtainedMarks: number;

  @ApiProperty({ example: 450 })
  gradedTotalMarks: number;

  @ApiProperty({ example: 700 })
  possibleTotalMarks: number;

  @ApiPropertyOptional({ example: 77.8, nullable: true })
  percentage: number | null;

  @ApiProperty({ example: 4 })
  gradedItems: number;

  @ApiProperty({ example: 10 })
  totalItems: number;
}

class MarksheetSummaryDto {
  @ApiProperty({ type: MarksheetCategorySummaryDto })
  assignments: MarksheetCategorySummaryDto;

  @ApiProperty({ type: MarksheetCategorySummaryDto })
  quizzes: MarksheetCategorySummaryDto;

  @ApiProperty({ type: MarksheetOverallSummaryDto })
  overall: MarksheetOverallSummaryDto;
}

class MarksheetAssignmentRowDto {
  @ApiProperty({ example: 14 })
  id: number;

  @ApiProperty({ example: 'Week 1 Assignment' })
  title: string;

  @ApiPropertyOptional({ example: 3, nullable: true })
  sectionId: number | null;

  @ApiPropertyOptional({ example: 'Basics', nullable: true })
  sectionTitle: string | null;

  @ApiPropertyOptional({ nullable: true })
  dueDate: Date | null;

  @ApiPropertyOptional({ example: 100, nullable: true })
  totalMarks: number | null;

  @ApiProperty({
    example: 'graded',
    enum: ['missing', 'submitted', 'graded', 'late'],
  })
  status: string;

  @ApiPropertyOptional({ example: 85, nullable: true })
  marksObtained: number | null;

  @ApiPropertyOptional({ nullable: true })
  comments: string | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;
}

class MarksheetQuizRowDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'JS Basics Quiz' })
  title: string;

  @ApiPropertyOptional({ example: 3, nullable: true })
  sectionId: number | null;

  @ApiPropertyOptional({ example: 'Basics', nullable: true })
  sectionTitle: string | null;

  @ApiPropertyOptional({ example: 50, nullable: true })
  totalMarks: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  attemptId: number | null;

  @ApiProperty({
    example: 'graded',
    enum: ['missing', 'submitted', 'graded'],
  })
  attemptStatus: 'missing' | 'submitted' | 'graded';

  @ApiPropertyOptional({ example: 40, nullable: true })
  marksObtained: number | null;

  @ApiPropertyOptional({ nullable: true })
  comments: string | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  gradedAt: Date | null;
}

export class CourseMarksheetResponseDto {
  @ApiProperty({ type: MarksheetStudentDto })
  student: MarksheetStudentDto;

  @ApiProperty({ type: MarksheetCourseDto })
  course: MarksheetCourseDto;

  @ApiProperty({ type: MarksheetSummaryDto })
  summary: MarksheetSummaryDto;

  @ApiProperty({ type: [MarksheetAssignmentRowDto] })
  assignments: MarksheetAssignmentRowDto[];

  @ApiProperty({ type: [MarksheetQuizRowDto] })
  quizzes: MarksheetQuizRowDto[];
}
