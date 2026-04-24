import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation successful',
    type: String,
  })
  message: string;
}

