import { ApiProperty } from '@nestjs/swagger';
import { AssignmentResponseDto } from './assignment-response.dto';
import { PaginationMetaDto } from 'src/common/dto/responses/paginated-courses-response.dto';

export class PaginatedAssignmentsResponseDto {
  @ApiProperty({
    description: 'List of assignments',
    type: [AssignmentResponseDto],
  })
  data: AssignmentResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

