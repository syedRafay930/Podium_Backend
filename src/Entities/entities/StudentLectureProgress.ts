import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Users } from './Users';
import { Lectures } from './Lectures';
import { Courses } from './Courses';

@Index('student_lecture_progress_pkey', ['id'], { unique: true })
@Unique('student_lecture_progress_student_lecture_unique', [
  'studentId',
  'lectureId',
])
@Entity('student_lecture_progress', { schema: 'public' })
export class StudentLectureProgress {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'student_id' })
  studentId: number;

  @Column('integer', { name: 'lecture_id' })
  lectureId: number;

  @Column('integer', { name: 'course_id' })
  courseId: number;

  @Column('timestamp without time zone', {
    name: 'completed_at',
    nullable: true,
    default: () => 'now()',
  })
  completedAt: Date | null;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'id' }])
  student: Users;

  @ManyToOne(() => Lectures, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'lecture_id', referencedColumnName: 'id' }])
  lecture: Lectures;

  @ManyToOne(() => Courses, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'course_id', referencedColumnName: 'id' }])
  course: Courses;
}
