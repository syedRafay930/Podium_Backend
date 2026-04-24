import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RelationModule } from "./RelationModule";

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

  @Column("integer", { name: "updated_by", nullable: true })
  updatedBy: number | null;

  @OneToMany(
    () => RelationModule,
    (relationModule) => relationModule.childModule
  )
  relationModules: RelationModule[];

  @OneToMany(
    () => RelationModule,
    (relationModule) => relationModule.parentModule
  )
  relationModules2: RelationModule[];
}
