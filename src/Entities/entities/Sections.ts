import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";
import { Lectures } from "./Lectures";
import { Quizzes } from "./Quizzes";
import { Resources } from "./Resources";
import { Courses } from "./Courses";
import { Users } from "./Users";

@Index("idx_sections_course_id", ["courseId"], {})
@Index("idx_sections_created_by", ["createdBy"], {})
@Index("sections_pkey", ["id"], { unique: true })
@Index("idx_sections_updated_by", ["updatedBy"], {})
@Entity("sections", { schema: "public" })
export class Sections {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "course_id", nullable: true })
  courseId: number | null;

  @Column("integer", { name: "created_by", nullable: true })
  createdBy: number | null;

  @Column("integer", { name: "updated_by", nullable: true })
  updatedBy: number | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.section)
  assignments: Assignment[];

  @OneToMany(() => Lectures, (lectures) => lectures.section)
  lectures: Lectures[];

  @OneToMany(() => Quizzes, (quizzes) => quizzes.section)
  quizzes: Quizzes[];

  @OneToMany(() => Resources, (resources) => resources.section)
  resources: Resources[];

  @ManyToOne(() => Courses, (courses) => courses.sections, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.sections, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy2: Users;

  @ManyToOne(() => Users, (users) => users.sections2, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy2: Users;
}
