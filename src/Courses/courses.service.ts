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
      teacher: teacher ?? undefined,
      createdAt: new Date(),
      createdBy: adminId as any,
      coverImg: coverImgUrl,
      languages: courseDto.Languages ?? null,
      isActive: true,
    };

    const course = this.courseRepository.create(courseData);
    return this.courseRepository.save(course);
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
}
