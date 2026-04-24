import { ApiProperty } from '@nestjs/swagger';
import { AttendanceResponseDto } from './attendance-response.dto';

class PaginationMetaDto {
  @ApiProperty({
    example: 56,
    description: 'Total number of attendance records',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Number of records per page',
  })
  limit: number;

  @ApiProperty({
    example: 6,
    description: 'Total number of pages',
  })
  totalPages: number;
}

export class PaginatedAttendanceResponseDto {
  @ApiProperty({
    type: [AttendanceResponseDto],
    description: 'Paginated attendance records',
  })
  data: AttendanceResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}
