import { BadRequestException } from '@nestjs/common';

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.zip',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.ppt',
  '.pptx',
];

// Allowed MIME types mapped to extensions
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.txt': ['text/plain'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 52428800 bytes

/**
 * Validates a submission file for assignment upload
 * @param file - The file to validate
 * @throws BadRequestException if file is invalid
 */
export function validateSubmissionFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    );
  }

  // Get file extension
  const originalName = file.originalname || '';
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === originalName.length - 1) {
    throw new BadRequestException('File must have a valid extension');
  }
  const extension = originalName.substring(lastDotIndex).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new BadRequestException(
      `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }

  // Validate MIME type
  const allowedMimeTypes = ALLOWED_MIME_TYPES[extension];
  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid MIME type for file extension. Expected one of: ${allowedMimeTypes?.join(', ')}`,
    );
  }

  // Sanitize filename (basic check for path traversal)
  if (
    originalName.includes('..') ||
    originalName.includes('/') ||
    originalName.includes('\\')
  ) {
    throw new BadRequestException('Invalid filename');
  }
}

/**
 * Sanitizes a filename by removing dangerous characters
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
}

