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
import { CourseRating } from "./CourseRating";
import { CourseCategory } from "./CourseCategory";
import { Users } from "./Users";
import { Enrollment } from "./Enrollment";
import { Lectures } from "./Lectures";
import { Quizzes } from "./Quizzes";
import { Resources } from "./Resources";
import { Sections } from "./Sections";

@Index("courses_pkey", ["id"], { unique: true })
@Entity("courses", { schema: "public" })
export class Courses {
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

  @Column("text", { name: "cover_img", nullable: true })
  coverImg: string | null;

  @Column("jsonb", { name: "languages", nullable: true })
  languages: object | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @Column("integer", { name: "total_lectures", nullable: true })
  totalLectures: number | null;

  @Column("boolean", { name: "is_active", nullable: true })
  isActive: boolean | null;

  @Column("character varying", {
    name: "teacher_status",
    length: 20,
    default: () => "'pending'",
  })
  teacherStatus: string;

  @Column("character varying", {
    name: "invitation_token",
    nullable: true,
    length: 255,
  })
  invitationToken: string | null;

  @OneToMany(() => Assignment, (assignment) => assignment.course)
  assignments: Assignment[];

  @OneToMany(() => CourseRating, (courseRating) => courseRating.course)
  courseRatings: CourseRating[];

  @ManyToOne(() => CourseCategory, (courseCategory) => courseCategory.courses)
  @JoinColumn([{ name: "course_category_id", referencedColumnName: "id" }])
  courseCategory: CourseCategory;

  @ManyToOne(() => Users, (users) => users.courses)
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Users;

  @ManyToOne(() => Users, (users) => users.courses2)
  @JoinColumn([{ name: "teacher_id", referencedColumnName: "id" }])
  teacher: Users | null;

  @ManyToOne(() => Users, (users) => users.courses3)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Users;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Lectures, (lectures) => lectures.course)
  lectures: Lectures[];

  @OneToMany(() => Quizzes, (quizzes) => quizzes.course)
  quizzes: Quizzes[];

  @OneToMany(() => Resources, (resources) => resources.course)
  resources: Resources[];

  @OneToMany(() => Sections, (sections) => sections.course)
  sections: Sections[];
}
