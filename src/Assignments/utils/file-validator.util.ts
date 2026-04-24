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
 * Validates a single file (internal core validator)
 * @param file - The file to validate
 * @param index - Optional index for error messages (0-based)
 * @throws BadRequestException if file is invalid
 */
function validateSingleFile(
  file: Express.Multer.File,
  index?: number,
): void {
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
  if (!allowedMimeTypes?.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid MIME type for ${extension}. Expected: ${allowedMimeTypes?.join(', ')}`,
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
 * Validates one or more files (unified validator)
 * @param files - Single file or array of files to validate
 * @throws BadRequestException if any file is invalid
 */
export function validateFiles(
  files: Express.Multer.File | Express.Multer.File[],
): void {
  if (!files || (Array.isArray(files) && files.length === 0)) {
    throw new BadRequestException('At least one file is required');
  }

  const fileArray = Array.isArray(files) ? files : [files];

  fileArray.forEach((file, index) => {
    try {
      validateSingleFile(file, index);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(`File ${index + 1}: ${error.message}`);
      }
      throw error;
    }
  });
}

/**
 * Validates a single submission file
 * @param file - The file to validate
 * @throws BadRequestException if file is invalid
 * @deprecated Use validateFiles instead
 */
export function validateSubmissionFile(file: Express.Multer.File): void {
  validateFiles(file);
}

/**
 * Validates an array of submission files
 * @param files - Array of files to validate
 * @throws BadRequestException if any file is invalid
 * @deprecated Use validateFiles instead
 */
export function validateSubmissionFiles(files: Express.Multer.File[]): void {
  validateFiles(files);
}

/**
 * Validates an array of files for assignment material upload
 * @param files - Array of files to validate
 * @throws BadRequestException if any file is invalid
 * @deprecated Use validateFiles instead
 */
export function validateAssignmentMaterialFiles(files: Express.Multer.File[]): void {
  validateFiles(files);
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

/**
 * Parses submission file(s) from database format (JSON array string)
 * Handles backward compatibility with old single URL format
 * @param submissionFile - The submission file value from database (JSON array string or single URL)
 * @returns Array of file URLs
 */
export function parseSubmissionFiles(submissionFile: string | null): string[] {
  if (!submissionFile) {
    return [];
  }

  try {
    // Parse as JSON array (new format)
    const parsed = JSON.parse(submissionFile);
    return Array.isArray(parsed) ? parsed : [submissionFile];
  } catch {
    // Backward compatibility: treat as single URL (old format)
    return [submissionFile];
  }
}

