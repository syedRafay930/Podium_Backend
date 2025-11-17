import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";
import { Student } from "./Student";

@Index("course_rating_pkey", ["id"], { unique: true })
@Entity("course_rating", { schema: "public" })
export class CourseRating {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "rating", nullable: true })
  rating: number | null;

  @Column("text", { name: "comment", nullable: true })
  comment: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Course, (course) => course.courseRatings, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Course;

  @ManyToOne(() => Student, (student) => student.courseRatings)
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Student;
}
