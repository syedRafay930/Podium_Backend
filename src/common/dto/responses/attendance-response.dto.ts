import { ApiProperty } from '@nestjs/swagger';

class AttendanceStudentDto {
  @ApiProperty({
    example: 15,
    description: 'Student user ID',
  })
  id: number;

  @ApiProperty({
    example: 'Ali Khan',
    description: 'Student full name',
  })
  name: string;

  @ApiProperty({
    example: 'PRESENT',
    description: 'Attendance status',
    enum: ['PRESENT', 'ABSENT'],
  })
  status: 'PRESENT' | 'ABSENT';
}

class AttendanceLectureDto {
  @ApiProperty({
    example: 3,
    description: 'Lecture ID',
  })
  id: number;

  @ApiProperty({
    example: 'Introduction to TypeScript',
    description: 'Lecture title',
  })
  title: string;
}

class AttendanceTeacherDto {
  @ApiProperty({
    example: 7,
    description: 'Teacher ID',
  })
  id: number;

  @ApiProperty({
    example: 'John Doe',
    description: 'Teacher name',
  })
  name: string;
}

export class AttendanceResponseDto {
  @ApiProperty({
    example: 101,
    description: 'Attendance ID',
  })
  id: number;

  @ApiProperty({
    example: '2026-01-27',
    description: 'Attendance date',
  })
  attendanceDate: string;

  @ApiProperty({
    type: AttendanceLectureDto,
  })
  lecture: AttendanceLectureDto;

  @ApiProperty({
    type: AttendanceTeacherDto,
  })
  teacher: AttendanceTeacherDto;

  @ApiProperty({
    type: [AttendanceStudentDto],
    description: 'Attendance details per student',
  })
  students: AttendanceStudentDto[];

  @ApiProperty({
    example: '2026-01-27T10:15:00.000Z',
    description: 'Record creation time',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-27T11:00:00.000Z',
    description: 'Last update time',
  })
  updatedAt: Date;
}
