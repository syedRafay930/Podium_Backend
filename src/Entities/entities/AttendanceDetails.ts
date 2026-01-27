import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Attendance } from "./Attendance";
import { Users } from "./Users";

@Index("attendance_detais_pkey", ["id"], { unique: true })
@Entity("attendance_details", { schema: "public" })
export class AttendanceDetails {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", { name: "status", length: 20 })
  status: string;

  @ManyToOne(() => Attendance, (attendance) => attendance.attendanceDetails)
  @JoinColumn([{ name: "attendance_id", referencedColumnName: "id" }])
  attendance: Attendance;

  @ManyToOne(() => Users, (users) => users.attendanceDetails)
  @JoinColumn([{ name: "student_id", referencedColumnName: "id" }])
  student: Users;
}
