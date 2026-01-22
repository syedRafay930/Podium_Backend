import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Courses } from "./Courses";
import { Users } from "./Users";

@Index("enrollment_student_course_unique", ["courseId", "studentId"], {
  unique: true,
})
@Index("enrollment_pkey", ["id"], { unique: true })
@Entity("enrollment", { schema: "public" })
export class Enrollment {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "student_id", unique: true })
  studentId: number;

  @Column("integer", { name: "course_id", unique: true })
  courseId: number;

  @Column("character varying", {
    name: "payment_status",
    length: 20,
    default: () => "'pending'",
  })
  paymentStatus: string;

  @Column("integer", { name: "lecture_viewed", default: () => "0" })
  lectureViewed: number;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Courses, (courses) => courses.enrollments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.enrollments, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "enrolled_by", referencedColumnName: "id" }])
  enrolledBy: Users;

  @ManyToOne(() => Users, (users) => users.enrollments2, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Users;
}
