import { ApiProperty } from '@nestjs/swagger';

export class QuizAttemptListDto {
  @ApiProperty() id: number;
  @ApiProperty() studentName: string;
  @ApiProperty() submittedAt: Date;
  @ApiProperty() totalMarks: number;
  @ApiProperty() isGraded: boolean;
}