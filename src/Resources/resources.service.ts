import {
  Injectable,
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Sections } from 'src/Entities/entities/Sections';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { ResourceListResponseDto } from './dto/resource-list-response.dto';
import { ResourceDetailResponseDto } from './dto/resource-detail-response.dto';
import { CourseResourcesResponseDto } from './dto/course-resources-response.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { uploadDocumentToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resources)
    private readonly resourceRepository: Repository<Resources>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Sections)
    private readonly sectionRepository: Repository<Sections>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  private mapResourceToDto(resource: Resources): ResourceListResponseDto {
    const dto: ResourceListResponseDto = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      fileUrl: resource.fileUrl,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      duration: resource.duration,
      isPreview: resource.isPreview ?? false,
      isActive: resource.isActive ?? true,
      courseId: resource.courseId,
      sectionId: resource.sectionId,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };

    if (resource.createdBy2) {
      dto.createdBy = {
        id: resource.createdBy2.id,
        firstName: resource.createdBy2.firstName,
        lastName: resource.createdBy2.lastName,
      };
    }

    if (resource.updatedBy2) {
      dto.updatedBy = {
        id: resource.updatedBy2.id,
        firstName: resource.updatedBy2.firstName,
        lastName: resource.updatedBy2.lastName,
      };
    }

    return dto;
  }

  private determineResourceTypeFromFile(
    fileName: string,
    mimeType: string,
  ): string {
    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'));

    // PDF files
    if (extension === '.pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }

    // Document files (PPT, DOCS, TXT) -> map to 'document'
    const documentExtensions = ['.ppt', '.pptx', '.doc', '.docx', '.txt'];
    if (documentExtensions.includes(extension)) {
      return 'document';
    }

    // Default to 'document' for other document-like MIME types
    if (
      mimeType.includes('word') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('presentation') ||
      mimeType === 'text/plain'
    ) {
      return 'document';
    }

    // Return as-is if already specified, otherwise default to 'document'
    return 'document';
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
      const matches = url.match(/\/upload\/[^/]+\/(.+)$/);
      if (matches && matches[1]) {
        // Remove file extension
        return matches[1].replace(/\.[^/.]+$/, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  async validateCourseAccess(
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<Courses> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (roleId === 2 && course.teacher?.id !== userId) {
      throw new ForbiddenException('You can only manage courses you teach');
    }

    if (roleId === 3) {
      throw new ForbiddenException('Students cannot manage courses');
    }

    return course;
  }

  async getResourceByIdInternal(resourceId: number): Promise<Resources> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: [
        'createdBy2',
        'updatedBy2',
        'course',
        'section',
        'section.course',
      ],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  // Main method
  async createCourseResource(
    courseId: number,
    dto: CreateResourceDto,
    file: Express.Multer.File | undefined,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    if (!file && dto.resourceType !== 'link') {
      throw new BadRequestException('File is required for non-link resources');
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let resourceType = dto.resourceType;

    if (file) {
      // Determine resource type from file if not explicitly set or if it's a document type
      if (!dto.resourceType || dto.resourceType === 'document') {
        resourceType = this.determineResourceTypeFromFile(
          file.originalname,
          file.mimetype,
        );
      }

      const uploadResult = await uploadDocumentToCloudinary(file);
      fileUrl = uploadResult.secure_url;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const resource = this.resourceRepository.create({
      title: dto.title,
      description: dto.description || null,
      resourceType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      duration: dto.duration || null,
      isPreview: dto.isPreview ?? false,
      isActive: dto.isActive ?? true,
      courseId,
      sectionId: null, // Course-level resource, no section
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedResource = await this.resourceRepository.save(resource);
    return this.mapResourceToDto(savedResource);
  }

  async createResourceBySection(
    courseId: number,
    sectionId: number,
    dto: CreateResourceDto,
    file: Express.Multer.File | undefined,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (!section.courseId) {
      throw new NotFoundException('Section does not belong to any course');
    }

    await this.validateCourseAccess(section.courseId, userId, roleId);

    if (!file && dto.resourceType !== 'link') {
      throw new BadRequestException('File is required for non-link resources');
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file) {
      // Determine resource type from file if not explicitly set or if it's a document type
      let resourceType = dto.resourceType;
      if (!dto.resourceType || dto.resourceType === 'document') {
        resourceType = this.determineResourceTypeFromFile(
          file.originalname,
          file.mimetype,
        );
      }

      const uploadResult = await uploadDocumentToCloudinary(file);
      fileUrl = uploadResult.secure_url;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
      dto.resourceType = resourceType; // Update DTO with determined type
    }

    const resource = this.resourceRepository.create({
      title: dto.title,
      description: dto.description || null,
      resourceType: dto.resourceType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      duration: dto.duration || null,
      isPreview: dto.isPreview ?? false,
      isActive: dto.isActive ?? true,
      sectionId,
      course: { id: courseId },
      createdBy: userId,
      createdAt: new Date(),
      courseId
    });

    const savedResource = await this.resourceRepository.save(resource);
    return this.mapResourceToDto(savedResource);
  }

  async getResourceById(
    resourceId: number,
    courseIdParam: number,
    sectionIdParam: number,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    // Get resource using shared internal method
    const resource = await this.getResourceByIdInternal(resourceId);

    if (!resource.sectionId) {
      throw new NotFoundException('Resource does not belong to any section');
    }

    // Get section to determine courseId
    const section = await this.sectionRepository.findOne({
      where: { id: resource.sectionId },
    });

    if (!section || !section.courseId) {
      throw new NotFoundException('Resource does not belong to any course');
    }

    // Validate courseId parameter matches resource's course (O(1) validation)
    if (courseIdParam !== section.courseId) {
      throw new BadRequestException(
        "Course ID parameter does not match the resource's course",
      );
    }

    // Validate sectionId parameter matches resource's section (O(1) validation)
    if (sectionIdParam !== resource.sectionId) {
      throw new BadRequestException(
        "Section ID parameter does not match the resource's section",
      );
    }

    // Validate teacher/admin access
    await this.validateCourseAccess(section.courseId, userId, roleId);

    return this.mapResourceToDto(resource);
  }

  async updateResource(
    resourceId: number,
    dto: UpdateResourceDto,
    file: Express.Multer.File | undefined,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['section', 'section.course'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (
      !resource.sectionId ||
      !resource.section ||
      !resource.section.courseId
    ) {
      throw new NotFoundException('Resource does not belong to any course');
    }

    const courseId = resource.section.courseId;
    await this.validateCourseAccess(courseId, userId, roleId);

    // Handle file replacement
    if (file) {
      // Determine resource type from file if updating
      let resourceType = dto.resourceType || resource.resourceType;
      if (resourceType === 'document' || !dto.resourceType) {
        resourceType = this.determineResourceTypeFromFile(
          file.originalname,
          file.mimetype,
        );
      }

      // Delete old file from Cloudinary
      if (resource.fileUrl) {
        try {
          const publicId = this.extractPublicIdFromUrl(resource.fileUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error(`Failed to delete old Cloudinary file: ${error}`);
        }
      }

      // Upload new file
      const uploadResult = await uploadDocumentToCloudinary(file);
      resource.fileUrl = uploadResult.secure_url;
      resource.fileName = file.originalname;
      resource.fileSize = file.size;
      resource.mimeType = file.mimetype;
      resource.resourceType = resourceType;
    }

    // Update other fields
    if (dto.title !== undefined) {
      resource.title = dto.title;
    }
    if (dto.description !== undefined) {
      resource.description = dto.description;
    }
    if (dto.resourceType !== undefined && !file) {
      resource.resourceType = dto.resourceType;
    }
    if (dto.isPreview !== undefined) {
      resource.isPreview = dto.isPreview;
    }
    if (dto.isActive !== undefined) {
      resource.isActive = dto.isActive;
    }
    if (dto.duration !== undefined) {
      resource.duration = dto.duration;
    }

    resource.updatedAt = new Date();
    resource.updatedBy = userId;

    const updatedResource = await this.resourceRepository.save(resource);
    return this.mapResourceToDto(updatedResource);
  }

  async deleteResource(
    resourceId: number,
    userId: number,
    roleId: number,
  ): Promise<{ message: string }> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['section', 'section.course'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (
      !resource.sectionId ||
      !resource.section ||
      !resource.section.courseId
    ) {
      throw new NotFoundException('Resource does not belong to any course');
    }

    const courseId = resource.section.courseId;
    await this.validateCourseAccess(courseId, userId, roleId);

    // Delete file from Cloudinary
    if (resource.fileUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(resource.fileUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (error) {
        console.error(`Failed to delete Cloudinary file: ${error}`);
      }
    }

    await this.resourceRepository.remove(resource);
    return { message: 'Resource deleted successfully' };
  }
}
