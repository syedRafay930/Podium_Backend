import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";

@Index("course_category_pkey", ["id"], { unique: true })
@Entity("course_category", { schema: "public" })
export class CourseCategory {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "name", nullable: true, length: 255 })
  name: string | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @OneToMany(() => Course, (course) => course.courseCategory)
  courses: Course[];
}
