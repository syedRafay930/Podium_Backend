import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateQuizDto } from './dto/create_quiz_dto';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { QuizQuestions } from 'src/Entities/entities/QuizQuestions';
import { QuizQuestionOptions } from 'src/Entities/entities/QuizQuestionOptions';
import { UpdateQuizDto } from './dto/update_quiz.dto';
import { SubmitQuizDto } from './dto/submit_quiz.dto';
import { QuizAttempts } from 'src/Entities/entities/QuizAttempts';
import { QuizStdAnswers } from 'src/Entities/entities/QuizStdAnswers';

@Injectable()
export class QuizService {
  constructor(private dataSource: DataSource) {}

  async createQuiz(createQuizDto: CreateQuizDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { questions, ...quizData } = createQuizDto;

      // 1. Create Quiz
      const quiz = queryRunner.manager.create(Quizzes, {
        title: quizData.title,
        description: quizData.description,
        totalMarks: quizData.total_marks,
        startTime: quizData.start_time,
        endTime: quizData.end_time,
        isPublished: quizData.is_Published,
        course_id: quizData.course_id,
        section_id: quizData.section_id,
        created_by: quizData.created_by,
        createdAt: new Date(),
      });
      const savedQuiz = await queryRunner.manager.save(quiz);

      // 2. Loop through Questions
      for (const qData of questions) {
        const { options, ...questionData } = qData;
        const question = queryRunner.manager.create(QuizQuestions, {
          questionText: questionData.question_text,
          questionType: questionData.question_type,
          marks: questionData.marks,
          quiz: { id: savedQuiz.id },
          createdAt: new Date(),
        });
        const savedQuestion = await queryRunner.manager.save(question);

        // 3. Create Options if they exist
        if (options && options.length > 0) {
          const optionsToSave = options.map((opt) =>
            queryRunner.manager.create(QuizQuestionOptions, {
              optionText: opt.option_text,
              isCorrect: opt.is_correct,
              question: { id: savedQuestion.id },
            }),
          );
          await queryRunner.manager.save(optionsToSave);
        }
      }

      await queryRunner.commitTransaction();
      return { message: 'Quiz created successfully', quizId: savedQuiz.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Failed to create quiz: ' + err.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateQuiz(quizId: number, updateQuizDto: UpdateQuizDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { questions, ...quizData } = updateQuizDto;

      // 1. Update Quiz Table
      await queryRunner.manager.update(Quizzes, quizId, {
        title: quizData.title,
        description: quizData.description,
        totalMarks: quizData.total_marks,
        startTime: quizData.start_time,
        endTime: quizData.end_time,
        isPublished: quizData.is_Published,
      });

      if (questions && questions.length > 0) {
        for (const qData of questions) {
          const { options, id: qId, ...questionFields } = qData;

          let currentQuestionId = qId;

          if (qId) {
            // UPDATE Question
            await queryRunner.manager.update(QuizQuestions, qId, {
              questionText: questionFields.question_text,
              questionType: questionFields.question_type,
              marks: questionFields.marks,
            });
          } else {
            // INSERT New Question
            const newQ = queryRunner.manager.create(QuizQuestions, {
              questionText: questionFields.question_text,
              questionType: questionFields.question_type,
              marks: questionFields.marks,
              quiz: { id: quizId },
            });
            const savedQ = await queryRunner.manager.save(newQ);
            currentQuestionId = savedQ.id;
          }

          // Handle Options (Simple approach: Delete existing and re-insert)
          if (options) {
            await queryRunner.manager.delete(QuizQuestionOptions, {
              question: { id: currentQuestionId },
            });
            const optionsToSave = options.map((opt) =>
              queryRunner.manager.create(QuizQuestionOptions, {
                optionText: opt.option_text,
                isCorrect: opt.is_correct,
                question: { id: currentQuestionId },
              }),
            );
            await queryRunner.manager.save(optionsToSave);
          }
        }
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Quiz updated successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(err.message);
    } finally {
      await queryRunner.release();
    }
  }

  async DeleteQuiz(quizId: number) {
    const quiz = await this.dataSource.getRepository(Quizzes).findOne({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    try {
      await this.dataSource.getRepository(Quizzes).delete(quizId);

      return {
        success: true,
        message: `Quiz ID ${quizId} and all its related questions/options have been permanently deleted.`,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Could not delete quiz: ' + error.message,
      );
    }
  }

  async getQuizById(quizId: number, roleId: number) {
    const quiz = await this.dataSource.getRepository(Quizzes).findOne({
      where: { id: quizId, isDelete: false },
      relations: ['quizQuestions', 'quizQuestions.quizQuestionOptions'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Mapping data to match DTO and handle security
    const response = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      total_marks: quiz.totalMarks,
      questions: quiz.quizQuestions.map((q) => {
        const question: any = {
          id: q.id,
          question_text: q.questionText,
          question_type: q.questionType,
          marks: q.marks,
        };
        // Only MCQ / BCQ have options
        if (q.questionType === 'MCQ' || q.questionType === 'BCQ') {
          question.options = q.quizQuestionOptions.map((o) => {
            const option: any = {
              id: o.id,
              option_text: o.optionText,
            };

            // SECURITY: expose is_correct only for teacher (roleId === 1 || 2)
            if (roleId === 1 || roleId === 2) {
              option.is_correct = o.isCorrect;
            }

            return option;
          });
        }

        return question;
      }),
    };

    return response;
  }

  async submitQuiz(userId: number, submitDto: SubmitQuizDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Quiz Attempt
      const attempt = queryRunner.manager.create(QuizAttempts, {
        quiz: { id: submitDto.quiz_id },
        student: { id: userId },
        submittedAt: new Date(),
        totalMarks: 0,
      });
      const savedAttempt = await queryRunner.manager.save(attempt);

      // 2. Save each answer
      const answersToSave = submitDto.answers.map((ans) => {
        return queryRunner.manager.create(QuizStdAnswers, {
          attempt: { id: savedAttempt.id },
          question: { id: ans.question_id },
          selectedOptionIds: ans.selected_option_ids || [],
          textAnswer: ans.text_answer || null,
          isCorrect: null,
          marksObtained: 0,
        });
      });

      await queryRunner.manager.save(answersToSave);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Quiz submitted successfully!',
        attemptId: savedAttempt.id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Submission failed: ' + err.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
