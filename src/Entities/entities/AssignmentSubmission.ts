import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";
import { Teacher } from "./Teacher";
import { Student } from "./Student";

@Index("assignment_submission_pkey", ["id"], { unique: true })
@Entity("assignment_submission", { schema: "public" })
export class AssignmentSubmission {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "submission_file",
    nullable: true,
    length: 500,
  })
  submissionFile: string | null;

  @Column("timestamp without time zone", {
    name: "submitted_at",
    nullable: true,
    default: () => "now()",
  })
  submittedAt: Date | null;

  @Column("integer", { name: "marks_obtained", nullable: true })
  marksObtained: number | null;

  @Column("character varying", { name: "status", nullable: true, length: 20 })
  status: string | null;

  @Column("text", { name: "comments", nullable: true })
  comments: string | null;

  @ManyToOne(
    () => Assignment,
    (assignment) => assignment.assignmentSubmissions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "assignment_id", referencedColumnName: "id" }])
  assignment: Assignment;

  @ManyToOne(() => Teacher, (teacher) => teacher.assignmentSubmissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "graded_by", referencedColumnName: "id" }])
  gradedBy: Teacher;

  @ManyToOne(() => Student, (student) => student.assignmentSubmissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Student;
}
