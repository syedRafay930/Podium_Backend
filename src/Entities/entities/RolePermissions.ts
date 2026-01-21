import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RelationModule } from "./RelationModule";
import { UserRole } from "./UserRole";

@Index("role_permissions_pkey", ["id"], { unique: true })
@Index("UQ_6762e22cf0253ca58fbb2f7edca", ["relationId", "roleId"], {
  unique: true,
})
@Entity("role_permissions", { schema: "public" })
export class RolePermissions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "relation_id", nullable: true, unique: true })
  relationId: number | null;

  @Column("integer", { name: "role_id", nullable: true, unique: true })
  roleId: number | null;

  @Column("boolean", { name: "is_enable", default: () => "false" })
  isEnable: boolean;

  @ManyToOne(
    () => RelationModule,
    (relationModule) => relationModule.rolePermissions,
    { onDelete: "CASCADE" }
  )
  @JoinColumn([{ name: "relation_id", referencedColumnName: "id" }])
  relation: RelationModule;

  @ManyToOne(() => UserRole, (userRole) => userRole.rolePermissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: UserRole;
}
