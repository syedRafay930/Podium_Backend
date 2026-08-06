import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StudentAttendanceCourseDto {
  @ApiProperty({ example: 2, description: 'Course ID' })
  id: number;

  @ApiProperty({
    example: 'Introduction to Web Development',
    description: 'Course name',
  })
  courseName: string;
}

class StudentAttendanceLectureDto {
  @ApiProperty({ example: 15, description: 'Lecture ID' })
  id: number;

  @ApiProperty({
    example: 'Live Session - HTML Basics',
    description: 'Lecture title',
  })
  title: string;

  @ApiProperty({
    example: 'live',
    description: 'Lecture type',
  })
  lectureType: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lecture order within the course',
    nullable: true,
  })
  lectureOrder: number | null;
}

class StudentAttendanceItemDto {
  @ApiProperty({ example: 101, description: 'Attendance session ID' })
  attendanceId: number;

  @ApiProperty({
    example: '2026-01-27',
    description: 'Attendance date',
    nullable: true,
  })
  attendanceDate: string | null;

  @ApiProperty({
    example: 'present',
    description: 'Student attendance status for this lecture',
    enum: ['present', 'absent', '-'],
  })
  status: string;

  @ApiProperty({ type: StudentAttendanceLectureDto })
  lecture: StudentAttendanceLectureDto;

  @ApiProperty({ type: StudentAttendanceCourseDto })
  course: StudentAttendanceCourseDto;
}

class StudentAttendanceSummaryDto {
  @ApiProperty({ example: 5, description: 'Number of present lectures' })
  present: number;

  @ApiProperty({ example: 2, description: 'Number of absent lectures' })
  absent: number;

  @ApiProperty({
    example: 1,
    description: 'Number of lectures with pending attendance status',
  })
  pending: number;

  @ApiProperty({ example: 8, description: 'Total attendance records' })
  total: number;
}

export class StudentAttendanceResponseDto {
  @ApiProperty({
    type: [StudentAttendanceItemDto],
    description: 'Lecture-wise attendance for the authenticated student',
  })
  data: StudentAttendanceItemDto[];

  @ApiProperty({
    type: StudentAttendanceSummaryDto,
    description: 'Attendance counts for the current filter',
  })
  summary: StudentAttendanceSummaryDto;
}
