import { ResourceListResponseDto } from './resource-list-response.dto';

/**
 * Resource detail response DTO
 * Extends ResourceListResponseDto with all resource metadata
 * Used for single resource retrieval endpoints
 */
export class ResourceDetailResponseDto extends ResourceListResponseDto {
  // Inherits all properties from ResourceListResponseDto
}

