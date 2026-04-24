import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { QuizAttempts } from "./QuizAttempts";
import { QuizQuestions } from "./QuizQuestions";
import { Courses } from "./Courses";
import { Users } from "./Users";
import { Sections } from "./Sections";

@Index("quizzes_pkey", ["id"], { unique: true })
@Entity("quizzes", { schema: "public" })
export class Quizzes {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "total_marks", nullable: true })
  totalMarks: number | null;

  @Column("timestamp without time zone", { name: "start_time" })
  startTime: Date;

  @Column("timestamp without time zone", { name: "end_time" })
  endTime: Date;

  @Column("boolean", {
    name: "is_published",
    nullable: true,
    default: () => "false",
  })
  isPublished: boolean | null;

  @Column("boolean", {
    name: "is_delete",
    nullable: true,
    default: () => "false",
  })
  isDelete: boolean | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @Column('integer', { name: 'course_id' })
  course_id: number;

  @Column('integer', { name: 'section_id', nullable: true })
  section_id: number | null;

  @Column('integer', { name: 'created_by' })
  created_by: number;

  @OneToMany(() => QuizAttempts, (quizAttempts) => quizAttempts.quiz)
  quizAttempts: QuizAttempts[];

  @OneToMany(() => QuizQuestions, (quizQuestions) => quizQuestions.quiz)
  quizQuestions: QuizQuestions[];

  @ManyToOne(() => Courses, (courses) => courses.quizzes, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.quizzes, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Users;

  @ManyToOne(() => Sections, (sections) => sections.quizzes, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "section_id", referencedColumnName: "id" }])
  section: Sections;
}
