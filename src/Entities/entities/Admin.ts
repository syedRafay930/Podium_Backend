import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";

@Index("admin_pkey", ["id"], { unique: true })
@Entity("admin", { schema: "public" })
export class Admin {
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

  @Column("character varying", {
    name: "hashed_password",
    nullable: true,
    length: 255,
  })
  hashedPassword: string | null;

  @Column("boolean", { name: "is_active", nullable: true })
  isActive: boolean | null;

  @Column("boolean", { name: "is_delete", nullable: true })
  isDelete: boolean | null;

  @OneToMany(() => Course, (course) => course.createdBy)
  courses: Course[];
}
