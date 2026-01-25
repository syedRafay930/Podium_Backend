import { ApiProperty } from '@nestjs/swagger';

export class UploadSubmissionDto {
  // Note: This field is for Swagger documentation only.
  // FilesInterceptor('files') extracts the files from multipart/form-data before it reaches this DTO.
  // The actual files are received via @UploadedFiles() decorator in the controller.
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description:
      'Assignment submission files. File field name must be "files". Multiple files can be uploaded (up to 10). Allowed types: PDF, ZIP, Word (.doc, .docx), Excel (.xls, .xlsx), Text (.txt), PowerPoint (.ppt, .pptx). Maximum size: 50MB per file.',
    required: true,
  })
  files?: any[];
}

