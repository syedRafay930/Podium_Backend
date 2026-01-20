import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Admin } from "./Admin";

@Index("modules_pkey", ["id"], { unique: true })
@Index("modules_module_name_key", ["moduleName"], { unique: true })
@Entity("modules", { schema: "public" })
export class Modules {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "module_name",
    nullable: true,
    unique: true,
    length: 255,
  })
  moduleName: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Admin, (admin) => admin.modules)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Admin;
}
