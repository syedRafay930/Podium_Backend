import { ApiProperty } from '@nestjs/swagger';

export class StudentDto {
  @ApiProperty({ description: 'Student ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'First name', example: 'John', type: String })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe', type: String })
  lastName: string;

  @ApiProperty({ description: 'Email', example: 'john.doe@example.com', type: String })
  email: string;
}

export class CourseBasicDto {
  @ApiProperty({ description: 'Course ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Course name', example: 'Advanced TypeScript', type: String })
  courseName: string;

  @ApiProperty({ description: 'Price', example: '99.99', type: String, nullable: true })
  price: string | null;

  @ApiProperty({ description: 'Cover image URL', example: 'https://example.com/image.jpg', type: String, nullable: true })
  coverImg: string | null;
}

export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Enrollment ID', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Student information', type: StudentDto })
  student: StudentDto;

  @ApiProperty({ description: 'Course information', type: CourseBasicDto })
  course: CourseBasicDto;

  @ApiProperty({ 
    description: 'Payment status', 
    example: 'pending', 
    enum: ['pending', 'paid', 'free'],
    type: String 
  })
  paymentStatus: string;

  @ApiProperty({ description: 'Number of lectures viewed', example: 5, type: Number })
  lectureViewed: number;

  @ApiProperty({ description: 'Enrolled by user ID (null if self-enrolled)', example: 1, type: Number, nullable: true })
  enrolledBy: number | null;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z', type: Date, nullable: true })
  createdAt: Date | null;

  @ApiProperty({ description: 'Updated at timestamp', example: '2024-01-01T00:00:00.000Z', type: Date, nullable: true })
  updatedAt: Date | null;
}
