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

@Index("enrolled_courses_pkey", ["id"], { unique: true })
@Entity("enrolled_courses", { schema: "public" })
export class EnrolledCourses {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("timestamp without time zone", {
    name: "enrolled_date",
    nullable: true,
  })
  enrolledDate: Date | null;

  @Column("real", {
    name: "progress_percentage",
    nullable: true,
    precision: 24,
  })
  progressPercentage: number | null;

  @Column("integer", { name: "complete_lecture_count", nullable: true })
  completeLectureCount: number | null;

  @Column("integer", { name: "total_lecture_count", nullable: true })
  totalLectureCount: number | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Course, (course) => course.enrolledCourses)
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Course;

  @ManyToOne(() => Student, (student) => student.enrolledCourses)
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Student;
}
