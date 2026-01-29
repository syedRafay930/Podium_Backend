import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { QuizQuestions } from "./QuizQuestions";

@Index("quiz_question_options_pkey", ["id"], { unique: true })
@Entity("quiz_question_options", { schema: "public" })
export class QuizQuestionOptions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("text", { name: "option_text" })
  optionText: string;

  @Column("boolean", {
    name: "is_correct",
    nullable: true,
    default: () => "false",
  })
  isCorrect: boolean | null;

  @ManyToOne(
    () => QuizQuestions,
    (quizQuestions) => quizQuestions.quizQuestionOptions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "question_id", referencedColumnName: "id" }])
  question: QuizQuestions;
}
