import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";
import { Quizzes } from "./Quizzes";
import { QuizStdAnswers } from "./QuizStdAnswers";

@Index("quiz_attempts_pkey", ["id"], { unique: true })
@Entity("quiz_attempts", { schema: "public" })
export class QuizAttempts {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("timestamp without time zone", {
    name: "submitted_at",
    nullable: true,
  })
  submittedAt: Date | null;

  @Column("integer", {
    name: "total_marks",
    nullable: true,
    default: () => "0",
  })
  totalMarks: number | null;

  @Column("text", { name: "comments", nullable: true })
  comments: string | null;

  @ManyToOne(() => Users, (users) => users.quizAttempts)
  @JoinColumn([{ name: "graded_by", referencedColumnName: "id" }])
  gradedBy: Users;

  @ManyToOne(() => Quizzes, (quizzes) => quizzes.quizAttempts, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "quiz_id", referencedColumnName: "id" }])
  quiz: Quizzes;

  @ManyToOne(() => Users, (users) => users.quizAttempts2, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Users;

  @OneToMany(() => QuizStdAnswers, (quizStdAnswers) => quizStdAnswers.attempt)
  quizStdAnswers: QuizStdAnswers[];
}
