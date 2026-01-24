import { ApiProperty } from '@nestjs/swagger';

export class UploadSubmissionDto {
  // Note: This field is for Swagger documentation only.
  // FileInterceptor('file') extracts the file from multipart/form-data before it reaches this DTO.
  // The actual file is received via @UploadedFile() decorator in the controller.
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'Assignment submission file. Allowed types: PDF, ZIP, Word (.doc, .docx), Excel (.xls, .xlsx), Text (.txt), PowerPoint (.ppt, .pptx). Maximum size: 50MB. File field name must be "file".',
    required: true,
  })
  file?: any;
}

