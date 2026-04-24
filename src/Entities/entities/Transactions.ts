import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Enrollment } from "./Enrollment";

@Index("uq_transaction_enroll", ["enrollId"], { unique: true })
@Index("transactions_pkey", ["id"], { unique: true })
@Index("transactions_uuid_key", ["uuid"], { unique: true })
@Entity("transactions", { schema: "public" })
export class Transactions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "uuid", unique: true, length: 20 })
  uuid: string;

  @Column("integer", { name: "enroll_id", unique: true })
  enrollId: number;

  @Column("numeric", {
    name: "amount",
    precision: 10,
    scale: 2,
    default: () => "0.00",
  })
  amount: string;

  @Column("character varying", {
    name: "status",
    length: 20,
    default: () => "'pending'",
  })
  status: string;

  @Column("character varying", {
    name: "payment_type",
    nullable: true,
    length: 20,
  })
  paymentType: string | null;

  @Column("timestamp without time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @OneToOne(() => Enrollment, (enrollment) => enrollment.transactions, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "enroll_id", referencedColumnName: "id" }])
  enroll: Enrollment;
}
