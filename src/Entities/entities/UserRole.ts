import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("user_role_pkey", ["id"], { unique: true })
@Index("user_role_role_name_key", ["roleName"], { unique: true })
@Entity("user_role", { schema: "public" })
export class UserRole {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "role_name", unique: true, length: 255 })
  roleName: string;

  @Column("boolean", { name: "is_active", nullable: true })
  isActive: boolean | null;

  @Column("boolean", { name: "is_delete", nullable: true })
  isDelete: boolean | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @Column("integer", { name: "created_by", nullable: true })
  createdBy: number | null;

  @Column("integer", { name: "deleted_by", nullable: true })
  deletedBy: number | null;

  @Column("integer", { name: "updated_by", nullable: true })
  updatedBy: number | null;

  @OneToMany(() => Users, (users) => users.role)
  users: Users[];
}
