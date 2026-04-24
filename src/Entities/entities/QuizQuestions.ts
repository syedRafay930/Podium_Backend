import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { QuizQuestionOptions } from "./QuizQuestionOptions";
import { Quizzes } from "./Quizzes";
import { QuizStdAnswers } from "./QuizStdAnswers";

@Index("quiz_questions_pkey", ["id"], { unique: true })
@Entity("quiz_questions", { schema: "public" })
export class QuizQuestions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("text", { name: "question_text" })
  questionText: string;

  @Column("enum", { name: "question_type", enum: ["MCQ", "BCQ", "SHORT"] })
  questionType: "MCQ" | "BCQ" | "SHORT";

  @Column("integer", { name: "marks", nullable: true, default: () => "1" })
  marks: number | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @OneToMany(
    () => QuizQuestionOptions,
    (quizQuestionOptions) => quizQuestionOptions.question
  )
  quizQuestionOptions: QuizQuestionOptions[];

  @ManyToOne(() => Quizzes, (quizzes) => quizzes.quizQuestions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "quiz_id", referencedColumnName: "id" }])
  quiz: Quizzes;

  @OneToMany(() => QuizStdAnswers, (quizStdAnswers) => quizStdAnswers.question)
  quizStdAnswers: QuizStdAnswers[];
}
