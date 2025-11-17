import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";
import { Teacher } from "./Teacher";
import { AssignmentSubmission } from "./AssignmentSubmission";

@Index("assignment_pkey", ["id"], { unique: true })
@Entity("assignment", { schema: "public" })
export class Assignment {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("character varying", {
    name: "short_description",
    nullable: true,
    length: 255,
  })
  shortDescription: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "total_marks", nullable: true })
  totalMarks: number | null;

  @Column("timestamp without time zone", { name: "due_date", nullable: true })
  dueDate: Date | null;

  @Column("character varying", {
    name: "file_url",
    nullable: true,
    length: 500,
  })
  fileUrl: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Course, (course) => course.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Course;

  @ManyToOne(() => Teacher, (teacher) => teacher.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Teacher;

  @OneToMany(
    () => AssignmentSubmission,
    (assignmentSubmission) => assignmentSubmission.assignment
  )
  assignmentSubmissions: AssignmentSubmission[];
}
