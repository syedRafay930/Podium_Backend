import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EnrollmentAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(EnrollmentAction)
  @ApiProperty({
    description: 'Action to perform on the enrollment',
    example: 'approve',
    enum: EnrollmentAction,
  })
  @IsEnum(EnrollmentAction)
  @IsNotEmpty()
  action: EnrollmentAction;

  @ApiProperty({
    description: 'Reason for rejection (required if action is reject)',
    required: false,
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
