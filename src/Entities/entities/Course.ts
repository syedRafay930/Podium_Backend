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
import { CourseCategory } from "./CourseCategory";
import { Admin } from "./Admin";
import { Teacher } from "./Teacher";
import { CourseRating } from "./CourseRating";
import { Lecture } from "./Lecture";

@Index("course_pkey", ["id"], { unique: true })
@Entity("course", { schema: "public" })
export class Course {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "course_name", length: 255 })
  courseName: string;

  @Column("character varying", {
    name: "short_description",
    nullable: true,
    length: 255,
  })
  shortDescription: string | null;

  @Column("numeric", { name: "price", nullable: true, precision: 10, scale: 2 })
  price: string | null;

  @Column("text", { name: "long_description", nullable: true })
  longDescription: string | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.course)
  assignments: Assignment[];

  @ManyToOne(() => CourseCategory, (courseCategory) => courseCategory.courses)
  @JoinColumn([{ name: "course_category_id", referencedColumnName: "id" }])
  courseCategory: CourseCategory;

  @ManyToOne(() => Admin, (admin) => admin.courses)
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Admin;

  @ManyToOne(() => Teacher, (teacher) => teacher.courses)
  @JoinColumn([{ name: "teacher_id", referencedColumnName: "id" }])
  teacher: Teacher | null;

  @OneToMany(() => CourseRating, (courseRating) => courseRating.course)
  courseRatings: CourseRating[];

  @OneToMany(() => Lecture, (lecture) => lecture.course)
  lectures: Lecture[];
}
