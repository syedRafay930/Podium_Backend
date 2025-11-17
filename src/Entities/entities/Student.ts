import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AssignmentSubmission } from "./AssignmentSubmission";
import { CourseRating } from "./CourseRating";

@Index("student_email_key", ["email"], { unique: true })
@Index("users_pkey", ["id"], { unique: true })
@Entity("student", { schema: "public" })
export class Student {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "first_name",
    nullable: true,
    length: 100,
  })
  firstName: string | null;

  @Column("character varying", {
    name: "last_name",
    nullable: true,
    length: 100,
  })
  lastName: string | null;

  @Column("character varying", { name: "email", unique: true, length: 255 })
  email: string;

  @Column("character varying", {
    name: "hashed_password",
    nullable: true,
    length: 255,
  })
  hashedPassword: string | null;

  @Column("date", { name: "date_of_birth", nullable: true })
  dateOfBirth: string | null;

  @Column("character varying", { name: "gender", nullable: true, length: 50 })
  gender: string | null;

  @Column("boolean", { name: "is_active", nullable: true })
  isActive: boolean | null;

  @Column("boolean", { name: "is_delete", nullable: true })
  isDelete: boolean | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(
    () => AssignmentSubmission,
    (assignmentSubmission) => assignmentSubmission.student
  )
  assignmentSubmissions: AssignmentSubmission[];

  @OneToMany(() => CourseRating, (courseRating) => courseRating.student)
  courseRatings: CourseRating[];
}
