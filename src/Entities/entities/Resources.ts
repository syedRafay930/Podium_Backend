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
import { Sections } from "./Sections";

@Index("idx_resources_course_id", ["courseId"], {})
@Index("idx_resources_created_by", ["createdBy"], {})
@Index("resources_pkey", ["id"], { unique: true })
@Index("idx_resources_section_id", ["sectionId"], {})
@Index("idx_resources_updated_by", ["updatedBy"], {})
@Entity("resources", { schema: "public" })
export class Resources {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("character varying", { name: "resource_type", length: 50 })
  resourceType: string;

  @Column("text", { name: "file_url", nullable: true })
  fileUrl: string | null;

  @Column("character varying", {
    name: "file_name",
    nullable: true,
    length: 255,
  })
  fileName: string | null;

  @Column("integer", { name: "file_size", nullable: true })
  fileSize: number | null;

  @Column("character varying", {
    name: "mime_type",
    nullable: true,
    length: 100,
  })
  mimeType: string | null;

  @Column("integer", { name: "duration", nullable: true })
  duration: number | null;

  @Column("boolean", {
    name: "is_preview",
    nullable: true,
    default: () => "false",
  })
  isPreview: boolean | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @Column("integer", { name: "section_id", nullable: true })
  sectionId: number | null;

  @Column("integer", { name: "created_by", nullable: true })
  createdBy: number | null;

  @Column("integer", { name: "updated_by", nullable: true })
  updatedBy: number | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @Column("integer", { name: "course_id", nullable: true })
  courseId: number | null;

  @ManyToOne(() => Courses, (courses) => courses.resources, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "course_id", referencedColumnName: "id" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.resources, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "created_by", referencedColumnName: "id" }])
  createdBy2: Users;

  @ManyToOne(() => Sections, (sections) => sections.resources, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "section_id", referencedColumnName: "id" }])
  section: Sections;

  @ManyToOne(() => Users, (users) => users.resources2, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy2: Users;
}
