import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";

@Index("idx_assignment_material_assignment_id", ["assignmentId"], {})
@Index("assignment_material_pkey", ["id"], { unique: true })
@Entity("assignment_material", { schema: "public" })
export class AssignmentMaterial {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "assignment_id" })
  assignmentId: number;

  @Column("text", { name: "file_url" })
  fileUrl: string;

  @Column("character varying", {
    name: "file_name",
    nullable: true,
    length: 255,
  })
  fileName: string | null;

  @Column("integer", { name: "file_size", nullable: true })
  fileSize: number | null;

  @Column("character varying", {
    name: "file_type",
    nullable: true,
    length: 100,
  })
  fileType: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Assignment, (assignment) => assignment.assignmentMaterials, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "assignment_id", referencedColumnName: "id" }])
  assignment: Assignment;
}
