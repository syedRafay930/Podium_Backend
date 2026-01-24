import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sections } from 'src/Entities/entities/Sections';
import { Resources } from 'src/Entities/entities/Resources';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { Assignment } from 'src/Entities/entities/Assignment';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { ResourceListResponseDto } from 'src/Resources/dto/resource-list-response.dto';
import { ResourcesService } from 'src/Resources/resources.service';
import { uploadDocumentToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CourseManagementService {
  constructor(
    @InjectRepository(Sections)
    private readonly sectionRepository: Repository<Sections>,
    @InjectRepository(Resources)
    private readonly resourceRepository: Repository<Resources>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    private readonly resourcesService: ResourcesService,
  ) {}

  // Validation helpers
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

  async validateSectionBelongsToCourse(
    sectionId: number,
    courseId: number,
  ): Promise<Sections> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Check if section belongs to course (directly or through parent)
    let currentSection: Sections | null = section;
    while (currentSection) {
      if (currentSection.courseId === courseId) {
        return section;
      }
      currentSection = currentSection.parentSection;
    }

    throw new ForbiddenException('Section does not belong to this course');
  }

  async validateResourceBelongsToSection(
    resourceId: number,
    sectionId: number,
  ): Promise<Resources> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['section'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.sectionId !== sectionId) {
      throw new ForbiddenException('Resource does not belong to this section');
    }

    return resource;
  }

  // Section methods
  async createSection(
    courseId: number,
    dto: CreateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = this.sectionRepository.create({
      title: dto.title,
      description: dto.description || null,
      courseId,
      parentSectionId: null,
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedSection = await this.sectionRepository.save(section);
    return this.mapSectionToDto(savedSection);
  }

  async createSubsection(
    courseId: number,
    parentSectionId: number,
    dto: CreateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    await this.validateCourseAccess(courseId, userId, roleId);

    // Validate parent section belongs to course
    const parentSection = await this.validateSectionBelongsToCourse(
      parentSectionId,
      courseId,
    );

    const section = this.sectionRepository.create({
      title: dto.title,
      description: dto.description || null,
      courseId: null, // Subsections don't have direct course reference
      parentSectionId: parentSection.id,
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedSection = await this.sectionRepository.save(section);
    return this.mapSectionToDto(savedSection);
  }

  async getSectionsByCourse(
    courseId: number,
    userId: number,
    roleId: number,
    includeResources = false,
  ): Promise<SectionResponseDto[]> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: includeResources
        ? ['parentSection', 'resources', 'createdBy2', 'updatedBy2']
        : ['parentSection', 'createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    // Get all subsections for these sections
    const sectionIds = sections.map((s) => s.id);
    let subsections: Sections[] = [];
    
    if (sectionIds.length > 0) {
      const query = this.sectionRepository
        .createQueryBuilder('section')
        .where('section.parentSectionId IN (:...ids)', { ids: sectionIds })
        .leftJoinAndSelect('section.createdBy2', 'createdBy')
        .leftJoinAndSelect('section.updatedBy2', 'updatedBy');
      
      if (includeResources) {
        query.leftJoinAndSelect('section.resources', 'resources');
      }
      
      subsections = await query.orderBy('section.createdAt', 'ASC').getMany();
    }

    // Build hierarchy
    return this.buildSectionHierarchy(sections, subsections, includeResources);
  }

  async getSectionById(
    sectionId: number,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection', 'resources', 'createdBy2', 'updatedBy2'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Validate access to the course
    if (section.courseId) {
      await this.validateCourseAccess(section.courseId, userId, roleId);
    } else if (section.parentSectionId) {
      // For subsections, validate through parent
      const parent = await this.sectionRepository.findOne({
        where: { id: section.parentSectionId },
        relations: ['course'],
      });
      if (parent?.courseId) {
        await this.validateCourseAccess(parent.courseId, userId, roleId);
      }
    }

    // Get subsections
    const subsections = await this.sectionRepository.find({
      where: { parentSectionId: sectionId },
      relations: ['resources', 'createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    const sectionDto = this.mapSectionToDto(section, true);
    sectionDto.subsections = subsections.map((sub) => this.mapSectionToDto(sub, true));
    return sectionDto;
  }

  async updateSection(
    sectionId: number,
    dto: UpdateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Validate access
    if (section.courseId) {
      await this.validateCourseAccess(section.courseId, userId, roleId);
    } else if (section.parentSectionId) {
      const parent = await this.sectionRepository.findOne({
        where: { id: section.parentSectionId },
        relations: ['course'],
      });
      if (parent?.courseId) {
        await this.validateCourseAccess(parent.courseId, userId, roleId);
      }
    }

    if (dto.title !== undefined) {
      section.title = dto.title;
    }
    if (dto.description !== undefined) {
      section.description = dto.description;
    }

    section.updatedAt = new Date();
    section.updatedBy = userId;

    const updatedSection = await this.sectionRepository.save(section);
    return this.mapSectionToDto(updatedSection);
  }

  async deleteSection(
    sectionId: number,
    userId: number,
    roleId: number,
    deleteAssignments: boolean = false,
  ): Promise<{ message: string }> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Validate access
    if (section.courseId) {
      await this.validateCourseAccess(section.courseId, userId, roleId);
    } else if (section.parentSectionId) {
      const parent = await this.sectionRepository.findOne({
        where: { id: section.parentSectionId },
        relations: ['course'],
      });
      if (parent?.courseId) {
        await this.validateCourseAccess(parent.courseId, userId, roleId);
      }
    }

    // Get all subsection IDs recursively (including nested subsections)
    const allSubsectionIds = await this.getAllSubsectionIds(sectionId);
    const allSectionIds = [sectionId, ...allSubsectionIds];

    // Delete assignments and their Cloudinary files if requested
    if (deleteAssignments) {
      const assignments = await this.assignmentRepository.find({
        where: { sectionId: In(allSectionIds) },
      });

      for (const assignment of assignments) {
        // Delete Cloudinary file if present
        if (assignment.fileUrl) {
          try {
            const publicId = this.extractPublicIdFromUrl(assignment.fileUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          } catch (error) {
            console.error(`Failed to delete assignment Cloudinary file: ${error}`);
          }
        }

        // Delete the assignment (submissions will be cascade-deleted)
        try {
          await this.assignmentRepository.remove(assignment);
        } catch (error) {
          console.error(`Failed to delete assignment: ${error}`);
        }
      }
    }

    // Delete the section (resources will be preserved with sectionId set to NULL)
    await this.sectionRepository.remove(section);
    return { message: 'Section deleted successfully' };
  }

  // Resource methods
  async createResource(
    sectionId: number,
    dto: CreateResourceDto,
    file: Express.Multer.File | undefined,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Determine courseId for validation
    let courseId = section.courseId;
    if (!courseId && section.parentSectionId) {
      const parent = await this.sectionRepository.findOne({
        where: { id: section.parentSectionId },
        relations: ['course'],
      });
      courseId = parent?.courseId || null;
    }

    if (courseId) {
      await this.validateCourseAccess(courseId, userId, roleId);
    }

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
        resourceType = this.determineResourceTypeFromFile(file.originalname, file.mimetype);
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
      createdBy: userId,
      createdAt: new Date(),
    });

    const savedResource = await this.resourceRepository.save(resource);
    return this.mapResourceToDto(savedResource);
  }

  /**
   * Determine resource type from file extension
   * Maps PPT, DOCS, TXT to 'document' type
   */
  private determineResourceTypeFromFile(
    fileName: string,
    mimeType: string,
  ): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
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
    if (mimeType.includes('word') || 
        mimeType.includes('powerpoint') || 
        mimeType.includes('presentation') ||
        mimeType === 'text/plain') {
      return 'document';
    }
    
    // Return as-is if already specified, otherwise default to 'document'
    return 'document';
  }

  /**
   * Create a resource directly attached to a course
   */
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
        resourceType = this.determineResourceTypeFromFile(file.originalname, file.mimetype);
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

  async getResourcesBySection(
    sectionId: number,
    courseIdParam: number,
    filters: {
      resourceType?: string;
      isActive?: boolean;
      isPreview?: boolean;
    },
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto[]> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Determine courseId from section (O(1) after query)
    let courseId = section.courseId;
    if (!courseId && section.parentSectionId) {
      courseId = await this.resourcesService.resolveSectionCourseId(sectionId);
    }

    if (!courseId) {
      throw new NotFoundException('Section does not belong to any course');
    }

    // Validate courseId parameter matches section's course (O(1) validation)
    if (courseIdParam !== courseId) {
      throw new BadRequestException(
        'Course ID parameter does not match the section\'s course',
      );
    }

    // Validate teacher/admin access
    await this.validateCourseAccess(courseId, userId, roleId);

    // Get resources using shared internal method
    const resources = await this.resourcesService.getResourcesBySectionInternal(
      sectionId,
      filters,
    );

    return resources.map((resource) => this.mapResourceToDto(resource));
  }

  async getResourceById(
    resourceId: number,
    courseIdParam: number,
    sectionIdParam: number,
    userId: number,
    roleId: number,
  ): Promise<ResourceListResponseDto> {
    // Get resource using shared internal method
    const resource = await this.resourcesService.getResourceByIdInternal(resourceId);

    // Determine courseId from resource's section
    let courseId: number | null = resource.courseId;
    if (!courseId && resource.sectionId) {
      courseId = await this.resourcesService.resolveSectionCourseId(resource.sectionId);
    }

    if (!courseId) {
      throw new NotFoundException('Resource does not belong to any course');
    }

    // Validate courseId parameter matches resource's course (O(1) validation)
    if (courseIdParam !== courseId) {
      throw new BadRequestException(
        'Course ID parameter does not match the resource\'s course',
      );
    }

    // Validate sectionId parameter matches resource's section (O(1) validation)
    if (resource.sectionId && sectionIdParam !== resource.sectionId) {
      throw new BadRequestException(
        'Section ID parameter does not match the resource\'s section',
      );
    }

    // Validate teacher/admin access
    await this.validateCourseAccess(courseId, userId, roleId);

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
      relations: ['section', 'section.course', 'section.parentSection', 'course'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Determine courseId - can be from courseId field or from section
    let courseId: number | null = resource.courseId;

    if (!courseId && resource.sectionId) {
      const section = resource.section;
      if (section) {
        courseId = section.courseId;
        if (!courseId && section.parentSectionId) {
          const parent = await this.sectionRepository.findOne({
            where: { id: section.parentSectionId },
            relations: ['course'],
          });
          courseId = parent?.courseId || null;
        }
      }
    }

    if (courseId) {
      await this.validateCourseAccess(courseId, userId, roleId);
    } else {
      throw new NotFoundException('Resource does not belong to any course');
    }

    // Handle file replacement
    if (file) {
      // Determine resource type from file if updating
      let resourceType = dto.resourceType || resource.resourceType;
      if (resourceType === 'document' || !dto.resourceType) {
        resourceType = this.determineResourceTypeFromFile(file.originalname, file.mimetype);
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
      relations: ['section', 'section.course', 'section.parentSection', 'course'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Determine courseId - can be from courseId field or from section
    let courseId: number | null = resource.courseId;

    if (!courseId && resource.sectionId) {
      const section = resource.section;
      if (section) {
        courseId = section.courseId;
        if (!courseId && section.parentSectionId) {
          const parent = await this.sectionRepository.findOne({
            where: { id: section.parentSectionId },
            relations: ['course'],
          });
          courseId = parent?.courseId || null;
        }
      }
    }

    if (courseId) {
      await this.validateCourseAccess(courseId, userId, roleId);
    } else {
      throw new NotFoundException('Resource does not belong to any course');
    }

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

  // Helper methods
  private buildSectionHierarchy(
    sections: Sections[],
    subsections: Sections[],
    includeResources = false,
  ): SectionResponseDto[] {
    const sectionMap = new Map<number, SectionResponseDto>();

    // Map all sections
    sections.forEach((section) => {
      sectionMap.set(section.id, this.mapSectionToDto(section, includeResources));
    });

    // Attach subsections to their parents
    subsections.forEach((subsection) => {
      const parentDto = sectionMap.get(subsection.parentSectionId!);
      if (parentDto) {
        if (!parentDto.subsections) {
          parentDto.subsections = [];
        }
        parentDto.subsections.push(this.mapSectionToDto(subsection, includeResources));
      }
    });

    return Array.from(sectionMap.values());
  }

  private mapSectionToDto(
    section: Sections,
    includeResources = false,
  ): SectionResponseDto {
    const dto: SectionResponseDto = {
      id: section.id,
      title: section.title,
      description: section.description,
      parentSectionId: section.parentSectionId,
      courseId: section.courseId,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };

    if (section.createdBy2) {
      dto.createdBy = {
        id: section.createdBy2.id,
        firstName: section.createdBy2.firstName,
        lastName: section.createdBy2.lastName,
      };
    }

    if (section.updatedBy2) {
      dto.updatedBy = {
        id: section.updatedBy2.id,
        firstName: section.updatedBy2.firstName,
        lastName: section.updatedBy2.lastName,
      };
    }

    if (includeResources && section.resources) {
      dto.resources = section.resources.map((resource) =>
        this.mapResourceToDto(resource),
      );
    }

    return dto;
  }

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
      isPreview: resource.isPreview,
      isActive: resource.isActive,
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

  private async getAllSubsectionIds(sectionId: number): Promise<number[]> {
    const subsectionIds: number[] = [];
    const subsections = await this.sectionRepository.find({
      where: { parentSectionId: sectionId },
    });

    for (const subsection of subsections) {
      subsectionIds.push(subsection.id);
      // Recursively get nested subsections
      const nestedSubsectionIds = await this.getAllSubsectionIds(subsection.id);
      subsectionIds.push(...nestedSubsectionIds);
    }

    return subsectionIds;
  }
}

