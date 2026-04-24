import { ApiProperty } from '@nestjs/swagger';

export class StudentQuizResultDto {
  @ApiProperty() quizTitle: string;
  @ApiProperty() totalMarksObtained: number;
  @ApiProperty() quizTotalMarks: number;
  @ApiProperty() teacherComments: string | null;
  @ApiProperty() submittedAt: Date;
  @ApiProperty({ type: [Object] }) questions: any[];
}