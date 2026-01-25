import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lectures } from 'src/Entities/entities/Lectures';
import { Courses } from 'src/Entities/entities/Courses';
import { Sections } from 'src/Entities/entities/Sections';
import { Users } from 'src/Entities/entities/Users';
import { GoogleCalendarService } from 'src/GoogleCalendar/google-calendar.service';
import { CreateRecordedLectureDto } from './dto/create-recorded-lecture.dto';
import { CreateLiveLectureDto } from './dto/create-live-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { LectureResponseDto } from './dto/lecture-response.dto';
import { uploadDocumentToCloudinary } from 'src/Cloudinary/cloudinary.helper';

@Injectable()
export class LecturesService {
  constructor(
    @InjectRepository(Lectures)
    private readonly lectureRepository: Repository<Lectures>,
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Sections)
    private readonly sectionRepository: Repository<Sections>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  /**
   * Validate course access (teacher of course or admin)
   */
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

    // Only admin (roleId = 1) or course teacher (roleId = 2) can create lectures
    if (roleId === 3) {
      throw new ForbiddenException('Students cannot create lectures');
    }

    if (roleId === 2 && course.teacher && course.teacher.id !== userId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    return course;
  }

  /**
   * Validate section belongs to course
   */
  async validateSectionBelongsToCourse(
    sectionId: number,
    courseId: number,
  ): Promise<Sections> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
    });
    if (!section || section.courseId != courseId) {
      throw new NotFoundException(
        'Section not found or does not belong to this course',
      );
    }

    return section;
  }

  /**
   * Create recorded lecture with video upload
   */
  async createRecordedLecture(
    dto: CreateRecordedLectureDto,
    userId: number,
    roleId: number,
    videoFile?: Express.Multer.File,
  ): Promise<LectureResponseDto> {
    // Validate course access
    await this.validateCourseAccess(dto.courseId, userId, roleId);

    // Validate section belongs to course
    await this.validateSectionBelongsToCourse(dto.sectionId, dto.courseId);

    let videoUrl: string | null = null;

    // Upload video to Cloudinary if provided
    if (videoFile) {
      try {
        const uploadResponse = await uploadDocumentToCloudinary(videoFile);
        videoUrl = uploadResponse.secure_url || uploadResponse.url;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload video: ${error.message}`,
        );
      }
    }

    // Create lecture
    const lecture = new Lectures();
    lecture.title = dto.title;
    lecture.description = dto.description || null;
    lecture.lectureType = 'recorded';
    lecture.videoUrl = videoUrl || null;
    lecture.duration = dto.duration || null;
    lecture.lectureOrder = dto.lectureOrder || null;
    lecture.createdAt = new Date();
    lecture.createdBy = { id: userId } as Users;
    lecture.course = { id: dto.courseId } as Courses;
    lecture.section = { id: dto.sectionId } as Sections;

    const savedLecture = await this.lectureRepository.save(lecture);
    const fetchedLecture = await this.lectureRepository.findOne({
      where: { id: savedLecture.id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!fetchedLecture) {
      throw new BadRequestException('Failed to retrieve saved lecture');
    }

    return this.mapLectureToDto(fetchedLecture);
  }

  /**
   * Create live lecture with Google Meet meeting
   */
  async createLiveLecture(
    dto: CreateLiveLectureDto,
    userId: number,
    roleId: number,
  ): Promise<LectureResponseDto> {
    // Validate course access
    await this.validateCourseAccess(dto.courseId, userId, roleId);

    // Validate section belongs to course
    await this.validateSectionBelongsToCourse(dto.sectionId, dto.courseId);

    // Check if teacher has connected Google Calendar
    const connectionStatus = await this.googleCalendarService.getConnectionStatus(
      userId,
    );

    if (!connectionStatus.connected) {
      throw new BadRequestException(
        'Google Calendar not connected. Please connect your Google Calendar to create live lectures.',
      );
    }

    let meetingLink: string | null = null;

    // Create event in Google Calendar with Google Meet
    try {
      const eventResponse = await this.googleCalendarService.createEvent(
        userId,
        {
          title: dto.title,
          startDateTime: new Date(dto.liveStart).toISOString(),
          duration: 60, // Default 1 hour, can be made configurable
          description: dto.description || '',
        },
      );
      meetingLink = eventResponse.meetLink || eventResponse.htmlLink;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create Google Meet event: ${error.message}`,
      );
    }

    // Create lecture
    const lecture = new Lectures();
    lecture.title = dto.title;
    lecture.description = dto.description || null;
    lecture.lectureType = 'online';
    lecture.liveStart = new Date(dto.liveStart);
    lecture.meetingLink = meetingLink;
    lecture.lectureOrder = dto.lectureOrder || null;
    lecture.createdAt = new Date();
    lecture.createdBy = { id: userId } as Users;
    lecture.course = { id: dto.courseId } as Courses;
    lecture.section = { id: dto.sectionId } as Sections;

    const savedLecture = await this.lectureRepository.save(lecture);
    const fetchedLecture = await this.lectureRepository.findOne({
      where: { id: savedLecture.id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!fetchedLecture) {
      throw new BadRequestException('Failed to retrieve saved lecture');
    }

    return this.mapLectureToDto(fetchedLecture);
  }

  /**
   * Get lectures by course and section
   */
  async getLecturesBySection(
    courseId: number,
    sectionId: number,
    userId: number,
    roleId: number,
  ): Promise<LectureResponseDto[]> {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    // Validate section belongs to course
    await this.validateSectionBelongsToCourse(sectionId, courseId);

    const lectures = await this.lectureRepository.find({
      where: {
        section: { id: sectionId },
        isDelete: false,
      },
      relations: ['createdBy', 'updatedBy'],
      order: {
        lectureOrder: 'ASC',
        createdAt: 'ASC',
      },
    });

    return lectures.map(lecture => this.mapLectureToDto(lecture));
  }

  /**
   * Get lecture by ID
   */
  async getLectureById(
    lectureId: number,
    userId: number,
    roleId: number,
  ): Promise<LectureResponseDto> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['createdBy', 'updatedBy', 'course'],
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Validate course access
    await this.validateCourseAccess(lecture.course.id, userId, roleId);

    return this.mapLectureToDto(lecture);
  }

  /**
   * Update lecture
   */
  async updateLecture(
    lectureId: number,
    courseId: number,
    dto: UpdateLectureDto,
    userId: number,
    roleId: number,
  ): Promise<LectureResponseDto> {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId, course: { id: courseId } },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found in this course');
    }

    // Update fields
    if (dto.title !== undefined) {
      lecture.title = dto.title;
    }
    if (dto.description !== undefined) {
      lecture.description = dto.description;
    }
    if (dto.lectureOrder !== undefined) {
      lecture.lectureOrder = dto.lectureOrder;
    }
    if (dto.duration !== undefined && lecture.lectureType === 'recorded') {
      lecture.duration = dto.duration;
    }
    if (dto.isDelete !== undefined) {
      lecture.isDelete = dto.isDelete;
    }

    lecture.updatedAt = new Date();
    lecture.updatedBy = { id: userId } as Users;

    const updated = await this.lectureRepository.save(lecture);
    const fetchedLecture = await this.lectureRepository.findOne({
      where: { id: updated.id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!fetchedLecture) {
      throw new BadRequestException('Failed to retrieve updated lecture');
    }

    return this.mapLectureToDto(fetchedLecture);
  }

  /**
   * Delete lecture (soft delete)
   */
  async deleteLecture(
    lectureId: number,
    courseId: number,
    userId: number,
    roleId: number,
  ): Promise<{ message: string }> {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId, course: { id: courseId } },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found in this course');
    }

    // Soft delete
    lecture.isDelete = true;
    lecture.updatedAt = new Date();
    lecture.updatedBy = { id: userId } as Users;

    await this.lectureRepository.save(lecture);

    return { message: 'Lecture deleted successfully' };
  }

  /**
   * Reorder lectures within a section
   */
  async reorderLectures(
    courseId: number,
    sectionId: number,
    lectureOrders: { lectureId: number; order: number }[],
    userId: number,
    roleId: number,
  ): Promise<{ message: string }> {
    // Validate course access
    await this.validateCourseAccess(courseId, userId, roleId);

    // Validate section belongs to course
    await this.validateSectionBelongsToCourse(sectionId, courseId);

    // Update all lecture orders
    for (const { lectureId, order } of lectureOrders) {
      const lecture = await this.lectureRepository.findOne({
        where: {
          id: lectureId,
          course: { id: courseId },
          section: { id: sectionId },
        },
      });

      if (!lecture) {
        throw new NotFoundException(
          `Lecture ${lectureId} not found in this section`,
        );
      }

      lecture.lectureOrder = order;
      lecture.updatedAt = new Date();
      lecture.updatedBy = { id: userId } as Users;

      await this.lectureRepository.save(lecture);
    }

    return { message: 'Lectures reordered successfully' };
  }

  /**
   * Map lecture to DTO
   */
  private mapLectureToDto(lecture: Lectures): LectureResponseDto {
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
      isDelete: lecture.isDelete,
      createdAt: lecture.createdAt,
      updatedAt: lecture.updatedAt,
      createdBy: {
        id: lecture.createdBy?.id,
        firstName: lecture.createdBy?.firstName,
        lastName: lecture.createdBy?.lastName,
        email: lecture.createdBy?.email,
      },
      updatedBy: lecture.updatedBy
        ? {
            id: lecture.updatedBy.id,
            firstName: lecture.updatedBy.firstName,
            lastName: lecture.updatedBy.lastName,
            email: lecture.updatedBy.email,
          }
        : null,
      courseId: lecture.course?.id,
      sectionId: lecture.section?.id,
    };
  }
}
