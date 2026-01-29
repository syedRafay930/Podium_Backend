import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptionDetailsDto {
  @ApiProperty() id: number;
  @ApiProperty() option_text: string;
  @ApiPropertyOptional() is_correct?: boolean; 
}

export class QuestionDetailsDto {
  @ApiProperty() id: number;
  @ApiProperty() question_text: string;
  @ApiProperty() question_type: string;
  @ApiProperty() marks: number;
  @ApiProperty({ type: [OptionDetailsDto] }) options: OptionDetailsDto[];
}

export class QuizDetailsResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() total_marks: number;
  @ApiProperty({ type: [QuestionDetailsDto] }) questions: QuestionDetailsDto[];
}