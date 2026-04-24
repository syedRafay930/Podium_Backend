import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Courses } from "./Courses";
import { Users } from "./Users";
import { Sections } from "./Sections";
import { AssignmentMaterial } from "./AssignmentMaterial";
import { AssignmentSubmission } from "./AssignmentSubmission";

@Index("assignment_pkey", ["id"], { unique: true })
@Index("idx_assignment_section_id", ["sectionId"], {})
@Entity("assignment", { schema: "public" })
export class Assignment {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("character varying", {
    name: "objective",
    nullable: true,
    length: 255,
  })
  objective: string | null;

  @Column("text", { name: "deliverable", nullable: true })
  deliverable: string | null;

  @Column("text", { name: "format", nullable: true })
  format: string | null;

  @Column("integer", { name: "total_marks", nullable: true })
  totalMarks: number | null;

  @Column("timestamp without time zone", { name: "due_date", nullable: true })
  dueDate: Date | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "section_id", nullable: true })
  sectionId: number | null;

  @ManyToOne(() => Courses, (courses) => courses.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.assignments, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Users;

  @ManyToOne(() => Sections, (sections) => sections.assignments, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "section_id", referencedColumnName: "id" }])
  section: Sections;

  @OneToMany(
    () => AssignmentMaterial,
    (assignmentMaterial) => assignmentMaterial.assignment
  )
  assignmentMaterials: AssignmentMaterial[];

  @OneToMany(
    () => AssignmentSubmission,
    (assignmentSubmission) => assignmentSubmission.assignment
  )
  assignmentSubmissions: AssignmentSubmission[];
}
