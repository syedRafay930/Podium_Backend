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
import { Lectures } from 'src/Entities/entities/Lectures';
import { Quizzes } from 'src/Entities/entities/Quizzes';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateResourceDto } from '../Resources/dto/create-resource.dto';
import { UpdateResourceDto } from '../Resources/dto/update-resource.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { SectionWithContentResponseDto } from './dto/section-with-content-response.dto';
import { ResourceListResponseDto } from 'src/Resources/dto/resource-list-response.dto';
//import { ResourcesService } from 'src/Resources/resources.service';
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
    @InjectRepository(Lectures)
    private readonly lectureRepository: Repository<Lectures>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Quizzes)
    private readonly quizRepository: Repository<Quizzes>,
    //private readonly resourcesService: ResourcesService,
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

    // if (roleId === 3) {
    //   throw new ForbiddenException('Students cannot manage courses');
    // }

    return course;
  }

  async validateSectionBelongsToCourse(
    sectionId: number,
    courseId: number,
  ): Promise<Sections> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, courseId },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException(
        'Section not found or does not belong to this course',
      );
    }

    return section;
  }

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
  ): Promise<SectionResponseDto[]> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    return sections.map((section) => this.mapSectionToDto(section));
  }

  async getSectionByCourseIdWithContent(
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<SectionWithContentResponseDto[]> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    // For each section, fetch assignments, lectures, and resources
    const sectionsWithContent = await Promise.all(
      sections.map(async (section) => {
        const quizWhereCondition: any = { section_id: section.id, isDelete: false };
        if (roleId === 3) { 
          quizWhereCondition.isPublished = true;
        }
        const [assignments, lectures, resources, quizzes] = await Promise.all([
          this.assignmentRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy', 'assignmentMaterials'],
            order: { createdAt: 'ASC' },
          }),
          this.lectureRepository
            .createQueryBuilder('lecture')
            .where('lecture.section_id = :sectionId', { sectionId: section.id })
            .leftJoinAndSelect('lecture.createdBy', 'createdBy')
            .orderBy('lecture.lectureOrder', 'ASC')
            .addOrderBy('lecture.createdAt', 'ASC')
            .getMany(),
          this.resourceRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy2'],
            order: { createdAt: 'ASC' },
          }),
          this.quizRepository.find({
          where: quizWhereCondition,
          relations: ['createdBy'],
          order: { createdAt: 'ASC' },
        }),
        ]);

        return this.mapSectionWithContentToDto(
          section,
          assignments,
          lectures,
          resources,
          quizzes
        );
      }),
    );

    return sectionsWithContent;
  }

  async getCourseByIdWithContent(
    courseId: number,
    userId: number,
    roleId: number,
  ) {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    // Fetch course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher', 'courseRatings'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Fetch all sections with their content
    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: ['createdBy2', 'updatedBy2'],
      order: { createdAt: 'ASC' },
    });

    // Get sections with content grouped by section
    const sectionsWithContent = await Promise.all(
      sections.map(async (section) => {
        const quizWhereCondition: any = { section_id: section.id, isDelete: false };
        if (roleId === 3) { 
          quizWhereCondition.isPublished = true;
        }
        const [assignments, lectures, resources, quizzes] = await Promise.all([
          this.assignmentRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy', 'assignmentMaterials'],
            order: { createdAt: 'ASC' },
          }),
          this.lectureRepository
            .createQueryBuilder('lecture')
            .where('lecture.section_id = :sectionId', { sectionId: section.id })
            .leftJoinAndSelect('lecture.createdBy', 'createdBy')
            .orderBy('lecture.lectureOrder', 'ASC')
            .addOrderBy('lecture.createdAt', 'ASC')
            .getMany(),
          this.resourceRepository.find({
            where: { sectionId: section.id },
            relations: ['createdBy2'],
            order: { createdAt: 'ASC' },
          }),
          this.quizRepository.find({
          where: quizWhereCondition,
          relations: ['createdBy'],
          order: { createdAt: 'ASC' },
        }),
        ]);

        return this.mapSectionWithContentToDto(
          section,
          assignments,
          lectures,
          resources,
          quizzes
        );
      }),
    );

    const baseResponse = {
      course,
      sections: sectionsWithContent,
    };

    // For admin (role_id = 1) and teacher (role_id = 2) - include enrollments
    if (roleId === 1 || roleId === 2) {
      const enrollments = await this.enrollmentRepository.find({
        where: { courseId },
        relations: ['student'],
        order: { createdAt: 'ASC' },
      });

      return {
        ...baseResponse,
        enrollments: enrollments.map((e) => ({
          id: e.id,
          studentId: e.student?.id,
          studentName: e.student
            ? `${e.student.firstName} ${e.student.lastName}`.trim()
            : null,
          studentEmail: e.student?.email,
          enrolledAt: e.createdAt,
        })),
        enrollmentCount: enrollments.length,
      };
    }

    // For students (role_id = 3) - only return course, sections, assignments, and lectures
    return baseResponse;
  }

  async updateSection(
    sectionId: number,
    courseId: number,
    dto: UpdateSectionDto,
    userId: number,
    roleId: number,
  ): Promise<SectionResponseDto> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = await this.validateSectionBelongsToCourse(
      sectionId,
      courseId,
    );

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
    courseId: number,
    userId: number,
    roleId: number,
    deleteAssignments: boolean = false,
  ): Promise<{ message: string }> {
    await this.validateCourseAccess(courseId, userId, roleId);

    const section = await this.validateSectionBelongsToCourse(
      sectionId,
      courseId,
    );

    // Delete assignments and their Cloudinary files if requested
    if (deleteAssignments) {
      const assignments = await this.assignmentRepository.find({
        where: { sectionId },
        relations: ['assignmentMaterials'],
      });

      // Collect all materials with valid fileUrls for parallel deletion
      const materialDeletions: Promise<void>[] = [];
      for (const assignment of assignments) {
        if (assignment.assignmentMaterials && assignment.assignmentMaterials.length > 0) {
          for (const material of assignment.assignmentMaterials) {
            if (material.fileUrl) {
              const publicId = this.extractPublicIdFromUrl(material.fileUrl);
              if (publicId) {
                materialDeletions.push(
                  cloudinary.uploader.destroy(publicId).catch((error) => {
                    console.error(
                      `Failed to delete assignment material Cloudinary file: ${error}`,
                    );
                  }),
                );
              }
            }
          }
        }
      }

      // Delete all Cloudinary files in parallel
      await Promise.all(materialDeletions);

      // Bulk delete assignments (materials and submissions will be cascade-deleted)
      if (assignments.length > 0) {
        try {
          await this.assignmentRepository.delete({ sectionId });
        } catch (error) {
          console.error(`Failed to delete assignments: ${error}`);
        }
      }
    }

    // Delete the section (resources will be preserved with sectionId set to NULL)
    await this.sectionRepository.remove(section);
    return { message: 'Section deleted successfully' };
  }
  
  // Helper methods

  private mapSectionToDto(section: Sections): SectionResponseDto {
    const dto: SectionResponseDto = {
      id: section.id,
      title: section.title,
      description: section.description,
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

    return dto;
  }

  private mapSectionWithContentToDto(
    section: Sections,
    assignments: Assignment[],
    lectures: Lectures[],
    resources: Resources[],
    quizzes: Quizzes[],
  ): SectionWithContentResponseDto {
    const dto: SectionWithContentResponseDto = {
      id: section.id,
      title: section.title,
      description: section.description,
      courseId: section.courseId,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      assignments: assignments.map((a) => this.mapAssignmentToDto(a)),
      lectures: lectures.map((l) => this.mapLectureToDto(l)),
      resources: resources.map((r) => this.mapResourceToContentDto(r)),
      quizzes: quizzes.map((q) => this.mapQuizToDto(q)),
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

    return dto;
  }

  private mapAssignmentToDto(assignment: Assignment) {
    const materials = assignment.assignmentMaterials?.map((material) => ({
      id: material.id,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileSize: material.fileSize,
      fileType: material.fileType,
    })) || [];

    return {
      id: assignment.id,
      title: assignment.title,
      objective: assignment.objective,
      deliverable: assignment.deliverable,
      format: assignment.format,
      totalMarks: assignment.totalMarks,
      dueDate: assignment.dueDate,
      description: assignment.description,
      createdAt: assignment.createdAt,
      materials: materials.length > 0 ? materials : undefined,
      createdBy: assignment.createdBy
        ? {
            id: assignment.createdBy.id,
            firstName: assignment.createdBy.firstName,
            lastName: assignment.createdBy.lastName,
          }
        : undefined,
    };
  }

  private mapLectureToDto(lecture: Lectures) {
    return {
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      lectureType: lecture.lectureType,
      videoUrl: lecture.videoUrl,
      duration: lecture.duration,
      liveStart: lecture.liveStart,
      meetingLink: lecture.meetingLink,
      lectureOrder: lecture.lectureOrder,
      createdAt: lecture.createdAt,
      updatedAt: lecture.updatedAt,
      createdBy: lecture.createdBy
        ? {
            id: lecture.createdBy.id,
            firstName: lecture.createdBy.firstName,
            lastName: lecture.createdBy.lastName,
          }
        : undefined,
    };
  }

  private mapResourceToContentDto(resource: Resources) {
    return {
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
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      createdBy: resource.createdBy2
        ? {
            id: resource.createdBy2.id,
            firstName: resource.createdBy2.firstName,
            lastName: resource.createdBy2.lastName,
          }
        : undefined,
    };
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

  private mapQuizToDto(quiz: Quizzes) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    totalMarks: quiz.totalMarks,
    startTime: quiz.startTime,
    endTime: quiz.endTime,
    isPublished: quiz.isPublished ?? false,
    createdAt: quiz.createdAt,
    createdBy: quiz.createdBy
      ? {
          id: quiz.createdBy.id,
          firstName: quiz.createdBy.firstName,
          lastName: quiz.createdBy.lastName,
        }
      : undefined,
  };
}
}
