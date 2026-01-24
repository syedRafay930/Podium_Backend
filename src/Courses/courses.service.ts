import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { AddCourseDto } from './dto/add_course.dto';
import { DeepPartial } from 'typeorm';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Lectures } from 'src/Entities/entities/Lectures';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { EditCourseDto } from './dto/edit_course.dto';
import { Assignment } from 'src/Entities/entities/Assignment';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/Nodemailer/mailer.service';
import { RedisService } from 'src/Auth/redis.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Courses)
    private readonly courseRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly adminRepository: Repository<Users>,
    @InjectRepository(Users)
    private readonly teacherRepository: Repository<Users>,
    @InjectRepository(CourseCategory)
    private readonly courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(CourseRating)
    private readonly courseRatingRepository: Repository<CourseRating>,
    @InjectRepository(Lectures)
    private readonly lecturesRepository: Repository<Lectures>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

  async createCourse(courseDto: AddCourseDto, adminId: number, file) {
    const category = await this.courseCategoryRepository.findOneBy({
      id: courseDto.CourseCategoryId,
    });
    if (!category) throw new NotFoundException('Course category not found');

    const courseExists = await this.courseRepository.findOneBy({
      courseName: courseDto.CourseName,
    });
    if (courseExists) throw new ConflictException('Course already exists');

    let teacher: Users | null = null;
    if (courseDto.TeacherId) {
      teacher = await this.teacherRepository.findOneBy({
        id: courseDto.TeacherId,
        role: { id: 2 },
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
    }

    let coverImgUrl: string | null = null;
    if (file) {
      const uploadResult = await uploadToCloudinary(file);
      coverImgUrl = uploadResult.secure_url;
    }

    const courseData: DeepPartial<Courses> = {
      courseName: courseDto.CourseName,
      shortDescription: courseDto.ShortDescription,
      price: courseDto.Price,
      longDescription: courseDto.LongDescription ?? null,
      courseCategory: category,
      createdAt: new Date(),
      createdBy: adminId as any,
      coverImg: coverImgUrl,
      languages: courseDto.Languages ?? null,
      isActive: true,
      invitationToken: teacher ? uuidv4() : undefined,
    };

    const course = this.courseRepository.create(courseData);
    const savedCourse = await this.courseRepository.save(course);

    if (teacher) {
      // Send notification to teacher about the new course assignment
      await this.assignTeacherToCourse(savedCourse.id, teacher.id, adminId);
    }
    return savedCourse
  }

  async getAllCourses(
    page: number,
    limit: number,
    category?: string,
    search?: string,
  ) {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.createdBy', 'admin')
      .addSelect(['admin.id', 'admin.firstName', 'admin.lastName'])
      .leftJoin('course.courseCategory', 'courseCategory')
      .addSelect(['courseCategory.id', 'courseCategory.name'])
      .leftJoin('course.teacher', 'teacher')
      .addSelect(['teacher.id', 'teacher.firstName', 'teacher.lastName'])
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(courseRating.rating)', 'avgRating')
          .from(CourseRating, 'courseRating')
          .where('courseRating.course_id = course.id');
      }, 'avgRating');

    if (category) {
      query.andWhere('courseCategory.id = :category', { category });
    }

    if (search) {
      query.andWhere('course.courseName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    query.skip((page - 1) * limit).take(limit);

    const { entities, raw } = await query.getRawAndEntities();
    const courses = entities.map((course, idx) => ({
      ...course,
      avgRating: raw[idx].avgRating ? parseFloat(raw[idx].avgRating) : 0,
    }));

    const total = await this.courseRepository
      .createQueryBuilder('course')
      .getCount();

    return {
      data: courses,
      meta: {
        totalItems: total,
        itemCount: courses.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getCourseById(courseId: number, userId?: number, userRole?: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher', 'lectures'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const ratingStats = await this.courseRatingRepository
      .createQueryBuilder('rating')
      .select('COUNT(rating.id)', 'count')
      .addSelect('AVG(rating.rating)', 'average')
      .where('rating.course_id = :id', { id: courseId })
      .getRawOne();

    const baseResponse = {
      ...course,
      ratingCount: Number(ratingStats.count) || 0,
      averageRating: Number(ratingStats.average) || 0,
    };

    // For admin (role_id = 1) and teacher (role_id = 2)
    if (userRole === 1 || userRole === 2) {
      // Get all enrollments with student details
      const enrollments = await this.enrollmentRepository.find({
        where: { courseId },
        relations: ['student'],
      });

      // Get all assignments for this course
      const assignments = await this.assignmentRepository.find({
        where: { course: { id: courseId } },
      });

      // Get all lectures for this course
      const lectures = await this.lecturesRepository.find({
        where: { course: { id: courseId } },
      });

      return {
        ...baseResponse,
        assignments,
        enrollments,
        enrollmentCount: enrollments.length,
        lectures,
      };
    }

    // For students (role_id = 3) - only return lectures and assignments
    const assignments = await this.assignmentRepository.find({
      where: { course: { id: courseId } },
    });

    // Get all lectures for this course
    const lectures = await this.lecturesRepository.find({
      where: { course: { id: courseId } },
    });

    return {
      ...baseResponse,
      assignments,
      lectures,
    };
  }

  async updateCourse(
    courseId: number,
    courseDto: EditCourseDto,
    adminId: number,
    file?: Express.Multer.File,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['courseCategory', 'teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Update category if provided
    if (courseDto.CourseCategoryId) {
      const category = await this.courseCategoryRepository.findOneBy({
        id: courseDto.CourseCategoryId,
      });
      if (!category) {
        throw new NotFoundException('Course category not found');
      }
      course.courseCategory = category;
    }

    // Update teacher if provided
    if (courseDto.TeacherId) {
      const teacher = await this.teacherRepository.findOneBy({
        id: courseDto.TeacherId,
        role: { id: 2 },
      });
      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }
      course.teacher = teacher;
    }

    // Update course image if file provided
    if (file) {
      const uploadResult = await uploadToCloudinary(file);
      course.coverImg = uploadResult.secure_url;
    }

    // Update other fields
    if (courseDto.CourseName) {
      // Check if course name already exists (excluding current course)
      const existingCourse = await this.courseRepository.findOne({
        where: {
          courseName: courseDto.CourseName,
        },
      });
      if (existingCourse && existingCourse.id !== courseId) {
        throw new ConflictException('A course with this name already exists');
      }
      course.courseName = courseDto.CourseName;
    }

    if (courseDto.ShortDescription) {
      course.shortDescription = courseDto.ShortDescription;
    }

    if (courseDto.Price) {
      course.price = courseDto.Price;
    }

    if (courseDto.LongDescription !== undefined) {
      course.longDescription = courseDto.LongDescription;
    }

    if (courseDto.Languages) {
      course.languages = courseDto.Languages;
    }

    if (courseDto.isActive) {
      course.isActive = courseDto.isActive;
    }

    course.updatedAt = new Date();
    course.updatedBy = adminId as any;

    const updatedCourse = await this.courseRepository.save(course);

    // Return course with all relations and stats
    return this.getCourseById(updatedCourse.id, adminId, 1);
  }

  async getAllCategories() {
    const categories = await this.courseCategoryRepository.find({
      order: {
        id: 'ASC',
      },
    });

    return categories;
  }

  // ==================== TEACHER ASSIGNMENT ====================

  async assignTeacherToCourse(
    courseId: number,
    teacherId: number,
    adminId: number,
  ): Promise<{ message: string; invitationToken: string }> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify teacher exists and has teacher role
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId, role: { id: 2 } },
      relations: ['role'],
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found or invalid teacher role');
    }

    // Generate unique invitation token
    const invitationToken = uuidv4();

    // Update course with teacher and set status to pending
    course.teacher = teacher;
    course.teacherStatus = 'pending';
    course.invitationToken = invitationToken;

    await this.courseRepository.save(course);

    // Store token in Redis with 24-hour expiry
    await this.redisService.setValue(
      `teacher-invite:${invitationToken}`,
      JSON.stringify({
        courseId,
        teacherId,
        courseName: course.courseName,
      }),
      86400, // 24 hours
    );

    // Send email to teacher
    try {
      const acceptLink = `http://localhost:3006/courses/${courseId}/teacher/action/${invitationToken}?action=accept`;
      const rejectLink = `http://localhost:3006/courses/${courseId}/teacher/action/${invitationToken}?action=reject`;

      await this.mailService.sendTemplatedMail(
        teacher.email,
        'Course Teaching Assignment - Action Required',
        'teacher-assignment',
        {
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          courseName: course.courseName,
          courseDescription:
            course.longDescription ||
            course.shortDescription ||
            'No description',
          coursePrice: course.price || 'Free',
          acceptLink,
          rejectLink,
        },
      );
    } catch (error) {
      console.error('Failed to send teacher assignment email:', error);
      // Don't throw error - assignment should succeed even if email fails
    }

    return {
      message: `Teacher assigned to course. Invitation email sent to ${teacher.email}`,
      invitationToken,
    };
  }

  async handleTeacherAction(
    courseId: number,
    invitationToken: string,
    action: 'accept' | 'reject',
  ): Promise<{ message: string; courseName: string }> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify token exists in Redis
    const tokenData = await this.redisService.getValue(
      `teacher-invite:${invitationToken}`,
    );

    if (!tokenData) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    // Verify token matches the course
    const parsedData = JSON.parse(tokenData);
    if (parsedData.courseId != courseId) {
      throw new UnauthorizedException('Token does not match the course');
    }

    if (action === 'accept') {
      course.teacherStatus = 'accepted';
      await this.courseRepository.save(course);

      // Delete token from Redis
      await this.redisService.deleteValue(`teacher-invite:${invitationToken}`);

      return { 
        message: 'Course assignment accepted successfully!',
        courseName: course.courseName,
      };
    } else if (action === 'reject') {
      course.teacherStatus = 'rejected';
      course.teacher = null;
      course.invitationToken = null;
      await this.courseRepository.save(course);

      // Delete token from Redis
      await this.redisService.deleteValue(`teacher-invite:${invitationToken}`);

      return { 
        message: 'Course assignment rejected',
        courseName: course.courseName,
      };
    } else {
      throw new UnauthorizedException('Invalid action');
    }
  }
}
