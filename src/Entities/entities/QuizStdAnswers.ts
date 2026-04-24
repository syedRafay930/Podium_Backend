import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { QuizAttempts } from "./QuizAttempts";
import { QuizQuestions } from "./QuizQuestions";

@Index("quiz_std_answers_pkey", ["id"], { unique: true })
@Entity("quiz_std_answers", { schema: "public" })
export class QuizStdAnswers {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("int4", { name: "selected_option_ids", nullable: true, array: true })
  selectedOptionIds: number[] | null;

  @Column("text", { name: "text_answer", nullable: true })
  textAnswer: string | null;

  @Column("boolean", { name: "is_correct", nullable: true })
  isCorrect: boolean | null;

  @Column("integer", {
    name: "marks_obtained",
    nullable: true,
    default: () => "0",
  })
  marksObtained: number | null;

  @ManyToOne(
    () => QuizAttempts,
    (quizAttempts) => quizAttempts.quizStdAnswers,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "attempt_id", referencedColumnName: "id" }])
  attempt: QuizAttempts;

  @ManyToOne(
    () => QuizQuestions,
    (quizQuestions) => quizQuestions.quizStdAnswers,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "question_id", referencedColumnName: "id" }])
  question: QuizQuestions;
}
