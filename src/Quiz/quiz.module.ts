import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { AuthModule } from 'src/Auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { QuizQuestions } from 'src/Entities/entities/QuizQuestions';
import { QuizQuestionOptions } from 'src/Entities/entities/QuizQuestionOptions';
import { QuizAttempts } from 'src/Entities/entities/QuizAttempts';
import { QuizStdAnswers } from 'src/Entities/entities/QuizStdAnswers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quizzes, QuizQuestions, QuizQuestionOptions, QuizAttempts, QuizStdAnswers]),
    AuthModule,
  ],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
