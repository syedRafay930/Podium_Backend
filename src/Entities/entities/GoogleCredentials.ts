import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("google_credentials_pkey", ["id"], { unique: true })
@Index("idx_google_credentials_is_active", ["isActive"], {})
@Index("google_credentials_user_id_key", ["userId"], { unique: true })
@Index("idx_google_credentials_user_id", ["userId"], {})
@Entity("google_credentials", { schema: "public" })
export class GoogleCredentials {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "user_id", unique: true })
  userId: number;

  @Column("text", { name: "access_token" })
  accessToken: string;

  @Column("text", { name: "refresh_token" })
  refreshToken: string;

  @Column("timestamp without time zone", {
    name: "token_expiry",
    nullable: true,
  })
  tokenExpiry: Date | null;

  @Column("character varying", {
    name: "google_email",
    nullable: true,
    length: 255,
  })
  googleEmail: string | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @OneToOne(() => Users, (users) => users.googleCredentials, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
