import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lectures } from "./Lectures";
import { Users } from "./Users";
import { AttendanceDetails } from "./AttendanceDetails";

@Index("attendance_pkey", ["id"], { unique: true })
@Entity("attendance", { schema: "public" })
export class Attendance {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("date", { name: "attendance_date", nullable: true })
  attendanceDate: string | null;

  @Column("timestamp without time zone", { name: "created_at", nullable: true })
  createdAt: Date | null;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Lectures, (lectures) => lectures.attendances)
  @JoinColumn([{ name: "lecture_id", referencedColumnName: "id" }])
  lecture: Lectures;

  @ManyToOne(() => Users, (users) => users.attendances)
  @JoinColumn([{ name: "teacher_id", referencedColumnName: "id" }])
  teacher: Users;

  @ManyToOne(() => Users, (users) => users.attendances2)
  @JoinColumn([{ name: "updated_by", referencedColumnName: "id" }])
  updatedBy: Users;

  @OneToMany(
    () => AttendanceDetails,
    (attendanceDetails) => attendanceDetails.attendance
  )
  attendanceDetails: AttendanceDetails[];
}
