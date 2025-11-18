import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Course } from 'src/Entities/entities/Course';
import { Admin } from 'src/Entities/entities/Admin';
import { Teacher } from 'src/Entities/entities/Teacher';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { AddCourseDto } from './dto/add_course.dto';
import { DeepPartial } from 'typeorm';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(CourseCategory)
    private readonly courseCategoryRepository: Repository<CourseCategory>,
  ) {}

  async createCourse(courseDto: AddCourseDto, adminId: number) {
    const category = await this.courseCategoryRepository.findOneBy({
      id: courseDto.CourseCategoryId,
    });
    if (!category) throw new NotFoundException('Course category not found');

    const courseExists = await this.courseRepository.findOneBy({
      courseName: courseDto.CourseName,
    });
    if (courseExists) throw new ConflictException('Course already exists');

    let teacher: Teacher | null = null;
    if (courseDto.TeacherId) {
      teacher = await this.teacherRepository.findOneBy({
        id: courseDto.TeacherId,
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
    }

    const courseData: DeepPartial<Course> = {
      courseName: courseDto.CourseName,
      shortDescription: courseDto.ShortDescription,
      price: courseDto.Price,
      longDescription: courseDto.LongDescription ?? null,
      courseCategory: category,
      teacher: teacher,
      createdAt: new Date(),
      createdBy: adminId as any,
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
      .leftJoinAndSelect('course.courseCategory', 'courseCategory')
      .leftJoinAndSelect('course.teacher', 'teacher');

    if (category) {
      query.andWhere('courseCategory.id = :category', { category });
    }

    if (search) {
      query.andWhere('course.courseName ILIKE :search', { search: `%${search}%` });
    }

    const [courses, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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
}
