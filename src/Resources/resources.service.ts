import {
  Injectable,
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

  /**
   * Validate that a student is enrolled in a course
   */
  async validateStudentEnrollment(
    courseId: number,
    studentId: number,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        studentId,
        courseId,
        status: 'enrolled',
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this course or enrollment is not active',
      );
    }

    return enrollment;
  }

  /**
   * Get course ID from a section (handles nested sections)
   * Private helper method
   */
  private async getCourseIdFromSection(sectionId: number): Promise<number | null> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      return null;
    }

    // If section has direct courseId, return it
    if (section.courseId) {
      return section.courseId;
    }

    // If it's a subsection, check parent
    if (section.parentSectionId) {
      const parent = await this.sectionRepository.findOne({
        where: { id: section.parentSectionId },
        relations: ['course'],
      });
      return parent?.courseId || null;
    }

    return null;
  }

  /**
   * Shared: Resolve courseId from a section (handles nested sections)
   * Public method for use by other services
   */
  async resolveSectionCourseId(sectionId: number): Promise<number | null> {
    return this.getCourseIdFromSection(sectionId);
  }

  /**
   * Shared: Get resources for a section (internal, no access control)
   * Returns Resources entities with relations loaded
   */
  async getResourcesBySectionInternal(
    sectionId: number,
    filters?: {
      resourceType?: string;
      isActive?: boolean;
      isPreview?: boolean;
    },
  ): Promise<Resources[]> {
    const query = this.resourceRepository
      .createQueryBuilder('resource')
      .where('resource.sectionId = :sectionId', { sectionId })
      .leftJoinAndSelect('resource.createdBy2', 'createdBy')
      .leftJoinAndSelect('resource.updatedBy2', 'updatedBy');

    if (filters?.resourceType) {
      query.andWhere('resource.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('resource.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.isPreview !== undefined) {
      query.andWhere('resource.isPreview = :isPreview', {
        isPreview: filters.isPreview,
      });
    }

    query.orderBy('resource.createdAt', 'ASC');

    return query.getMany();
  }

  /**
   * Shared: Get a resource by ID (internal, no access control)
   * Returns Resource entity with relations loaded
   */
  async getResourceByIdInternal(resourceId: number): Promise<Resources> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: [
        'createdBy2',
        'updatedBy2',
        'course',
        'section',
        'section.course',
        'section.parentSection',
      ],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  /**
   * Get all resources for all enrolled courses (cumulative view)
   */
  async getResourcesForEnrolledCourses(
    userId: number,
  ): Promise<CourseResourcesResponseDto[]> {
    // Get all enrollments for the student
    const enrollments = await this.enrollmentRepository.find({
      where: {
        studentId: userId,
        status: 'enrolled',
      },
      relations: ['course'],
    });

    if (enrollments.length === 0) {
      return [];
    }

    const courseIds = enrollments.map((e) => e.courseId);

    // Get all resources for these courses (both course-level and section-level)
    const courseResources = await this.resourceRepository.find({
      where: {
        courseId: In(courseIds),
        isActive: true,
      },
      relations: ['createdBy2', 'updatedBy2', 'course'],
    });

    // Get all section resources for these courses
    const sections = await this.sectionRepository.find({
      where: {
        courseId: In(courseIds),
      },
    });

    const sectionIds = sections.map((s) => s.id);

    const sectionResources = sectionIds.length > 0
      ? await this.resourceRepository.find({
          where: {
            sectionId: In(sectionIds),
            isActive: true,
          },
          relations: ['createdBy2', 'updatedBy2', 'section'],
        })
      : [];

    // Group resources by course
    const resourcesByCourse = new Map<number, ResourceListResponseDto[]>();

    // Add course-level resources
    courseResources.forEach((resource) => {
      if (resource.courseId) {
        if (!resourcesByCourse.has(resource.courseId)) {
          resourcesByCourse.set(resource.courseId, []);
        }
        resourcesByCourse.get(resource.courseId)!.push(this.mapResourceToDto(resource));
      }
    });

    // Add section-level resources
    // Create a map of sectionId -> courseId for efficient lookup
    const sectionToCourseMap = new Map<number, number>();
    for (const section of sections) {
      sectionToCourseMap.set(section.id, section.courseId!);
    }

    for (const resource of sectionResources) {
      if (resource.sectionId) {
        const courseId = sectionToCourseMap.get(resource.sectionId);
        if (courseId && courseIds.includes(courseId)) {
          if (!resourcesByCourse.has(courseId)) {
            resourcesByCourse.set(courseId, []);
          }
          resourcesByCourse.get(courseId)!.push(this.mapResourceToDto(resource));
        }
      }
    }

    // Build response
    return enrollments.map((enrollment) => ({
      courseId: enrollment.courseId,
      courseName: enrollment.course.courseName,
      resources: resourcesByCourse.get(enrollment.courseId) || [],
    }));
  }

  /**
   * Get all resources for a specific enrolled course
   */
  async getResourcesByCourse(
    courseId: number,
    userId: number,
    filters?: {
      resourceType?: string;
      isActive?: boolean;
      isPreview?: boolean;
    },
  ): Promise<ResourceListResponseDto[]> {
    // Validate enrollment
    await this.validateStudentEnrollment(courseId, userId);

    // Build query for course-level resources
    const query = this.resourceRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.createdBy2', 'createdBy')
      .leftJoinAndSelect('resource.updatedBy2', 'updatedBy')
      .leftJoinAndSelect('resource.course', 'course')
      .where('resource.courseId = :courseId', { courseId })
      .andWhere('resource.isActive = :isActive', { isActive: true });

    if (filters?.resourceType) {
      query.andWhere('resource.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters?.isPreview !== undefined) {
      query.andWhere('resource.isPreview = :isPreview', {
        isPreview: filters.isPreview,
      });
    }

    const courseResources = await query.getMany();

    // Get all sections for this course
    const sections = await this.sectionRepository.find({
      where: { courseId },
    });

    const sectionIds = sections.map((s) => s.id);

    // Get section-level resources
    let sectionResources: Resources[] = [];
    if (sectionIds.length > 0) {
      const sectionQuery = this.resourceRepository
        .createQueryBuilder('resource')
        .leftJoinAndSelect('resource.createdBy2', 'createdBy')
        .leftJoinAndSelect('resource.updatedBy2', 'updatedBy')
        .leftJoinAndSelect('resource.section', 'section')
        .where('resource.sectionId IN (:...sectionIds)', { sectionIds })
        .andWhere('resource.isActive = :isActive', { isActive: true });

      if (filters?.resourceType) {
        sectionQuery.andWhere('resource.resourceType = :resourceType', {
          resourceType: filters.resourceType,
        });
      }

      if (filters?.isPreview !== undefined) {
        sectionQuery.andWhere('resource.isPreview = :isPreview', {
          isPreview: filters.isPreview,
        });
      }

      sectionResources = await sectionQuery.getMany();
    }

    // Combine and return
    const allResources = [...courseResources, ...sectionResources];
    return allResources.map((resource) => this.mapResourceToDto(resource));
  }

  /**
   * Get resources for a specific section/subsection
   * Public method with student access control
   */
  async getResourcesBySection(
    sectionId: number,
    userId: number,
  ): Promise<ResourceListResponseDto[]> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course', 'parentSection'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Determine courseId
    const courseId = await this.resolveSectionCourseId(sectionId);

    if (!courseId) {
      throw new NotFoundException('Section does not belong to any course');
    }

    // Validate enrollment (student access control)
    await this.validateStudentEnrollment(courseId, userId);

    // Get resources using shared internal method (only active for students)
    const resources = await this.getResourcesBySectionInternal(sectionId, {
      isActive: true,
    });

    return resources.map((resource) => this.mapResourceToDto(resource));
  }

  /**
   * Get a specific resource by ID
   * Public method with student access control
   */
  async getResourceById(
    resourceId: number,
    userId: number,
  ): Promise<ResourceDetailResponseDto> {
    // Get resource using shared internal method
    const resource = await this.getResourceByIdInternal(resourceId);

    // Determine courseId
    let courseId: number | null = resource.courseId;

    if (!courseId && resource.sectionId) {
      courseId = await this.resolveSectionCourseId(resource.sectionId);
    }

    if (!courseId) {
      throw new NotFoundException('Resource does not belong to any course');
    }

    // Validate enrollment (student access control)
    await this.validateStudentEnrollment(courseId, userId);

    // Check if resource is active (students can only see active resources)
    if (!resource.isActive) {
      throw new ForbiddenException('Resource is not active');
    }

    return this.mapResourceToDto(resource) as ResourceDetailResponseDto;
  }

  /**
   * Map Resources entity to DTO
   */
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
}

