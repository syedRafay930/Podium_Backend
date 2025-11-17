import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Course } from "./Course";

@Index("lecture_pkey", ["id"], { unique: true })
@Entity("lecture", { schema: "public" })
export class Lecture {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "lecture_title", length: 255 })
  lectureTitle: string;

  @Column("text", { name: "lecture_description", nullable: true })
  lectureDescription: string | null;

  @Column("character varying", {
    name: "lecture_type",
    nullable: true,
    length: 20,
  })
  lectureType: string | null;

  @Column("character varying", {
    name: "video_url",
    nullable: true,
    length: 500,
  })
  videoUrl: string | null;

  @Column("timestamp without time zone", { name: "live_start", nullable: true })
  liveStart: Date | null;

  @Column("character varying", {
    name: "meeting_link",
    nullable: true,
    length: 500,
  })
  meetingLink: string | null;

  @Column("integer", { name: "lecture_number", nullable: true })
  lectureNumber: number | null;

  @Column("integer", { name: "duration", nullable: true })
  duration: number | null;

  @Column("boolean", { name: "is_recorded", nullable: true })
  isRecorded: boolean | null;

  @Column("boolean", { name: "is_delete", nullable: true })
  isDelete: boolean | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Course, (course) => course.lectures, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Course;
}
