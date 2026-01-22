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
import { AssignmentSubmission } from "./AssignmentSubmission";
import { CourseCategory } from "./CourseCategory";
import { CourseRating } from "./CourseRating";
import { Courses } from "./Courses";
import { Enrollment } from "./Enrollment";
import { Lectures } from "./Lectures";
import { UserRole } from "./UserRole";

@Index("users_email_key", ["email"], { unique: true })
@Index("users_pkey1", ["id"], { unique: true })
@Entity("users", { schema: "public" })
export class Users {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "first_name", length: 255 })
  firstName: string;

  @Column("character varying", { name: "last_name", length: 255 })
  lastName: string;

  @Column("character varying", { name: "email", unique: true, length: 255 })
  email: string;

  @Column("character varying", {
    name: "hashed_password",
    nullable: true,
    length: 255,
  })
  hashedPassword: string | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @Column("boolean", {
    name: "is_delete",
    nullable: true,
    default: () => "false",
  })
  isDelete: boolean | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @Column("timestamp without time zone", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.createdBy)
  assignments: Assignment[];

  @OneToMany(
    () => AssignmentSubmission,
    (assignmentSubmission) => assignmentSubmission.gradedBy
  )
  assignmentSubmissions: AssignmentSubmission[];

  @OneToMany(
    () => AssignmentSubmission,
    (assignmentSubmission) => assignmentSubmission.student
  )
  assignmentSubmissions2: AssignmentSubmission[];

  @OneToMany(() => CourseCategory, (courseCategory) => courseCategory.createdBy)
  courseCategories: CourseCategory[];

  @OneToMany(() => CourseCategory, (courseCategory) => courseCategory.updatedBy)
  courseCategories2: CourseCategory[];

  @OneToMany(() => CourseRating, (courseRating) => courseRating.student)
  courseRatings: CourseRating[];

  @OneToMany(() => Courses, (courses) => courses.createdBy)
  courses: Courses[];

  @OneToMany(() => Courses, (courses) => courses.teacher)
  courses2: Courses[];

  @OneToMany(() => Courses, (courses) => courses.updatedBy)
  courses3: Courses[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.enrolledBy)
  enrollments: Enrollment[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments2: Enrollment[];

  @OneToMany(() => Lectures, (lectures) => lectures.createdBy)
  lectures: Lectures[];

  @OneToMany(() => Lectures, (lectures) => lectures.updatedBy)
  lectures2: Lectures[];

  @ManyToOne(() => Users, (users) => users.users, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Users;

  @OneToMany(() => Users, (users) => users.createdBy)
  users: Users[];

  @ManyToOne(() => Users, (users) => users.users2, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "deleted_by", referencedColumnName: "id" }])
  deletedBy: Users;

  @OneToMany(() => Users, (users) => users.deletedBy)
  users2: Users[];

  @ManyToOne(() => UserRole, (userRole) => userRole.users, {
    onDelete: "RESTRICT",
  })
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: UserRole;

  @ManyToOne(() => Users, (users) => users.users3, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Users;

  @OneToMany(() => Users, (users) => users.updatedBy)
  users3: Users[];
}
