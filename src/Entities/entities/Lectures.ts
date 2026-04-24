import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Attendance } from "./Attendance";
import { Courses } from "./Courses";
import { Users } from "./Users";
import { Sections } from "./Sections";

@Index("lectures_pkey", ["id"], { unique: true })
@Entity("lectures", { schema: "public" })
export class Lectures {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("character varying", { name: "lecture_type", length: 20 })
  lectureType: string;

  @Column("character varying", {
    name: "video_url",
    nullable: true,
    length: 500,
  })
  videoUrl: string | null;

  @Column("integer", { name: "duration", nullable: true })
  duration: number | null;

  @Column("timestamp without time zone", { name: "live_start", nullable: true })
  liveStart: Date | null;

  @Column("character varying", {
    name: "meeting_link",
    nullable: true,
    length: 500,
  })
  meetingLink: string | null;

  @Column("integer", { name: "lecture_order", nullable: true })
  lectureOrder: number | null;

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

  @OneToMany(() => Attendance, (attendance) => attendance.lecture)
  attendances: Attendance[];

  @ManyToOne(() => Courses, (courses) => courses.lectures, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.lectures, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy: Users;

  @ManyToOne(() => Sections, (sections) => sections.lectures, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "section_id", referencedColumnName: "id" }])
  section: Sections;

  @ManyToOne(() => Users, (users) => users.lectures2, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Users;
}
