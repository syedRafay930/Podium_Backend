import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";

@Index("teacher_pkey", ["id"], { unique: true })
@Entity("teacher", { schema: "public" })
export class Teacher {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "first_name",
    nullable: true,
    length: 255,
  })
  firstName: string | null;

  @Column("character varying", {
    name: "last_name",
    nullable: true,
    length: 255,
  })
  lastName: string | null;

  @Column("character varying", { name: "email", nullable: true, length: 255 })
  email: string | null;

  @OneToMany(() => Course, (course) => course.teacher)
  courses: Course[];
}
