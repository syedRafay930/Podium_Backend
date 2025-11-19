import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from 'src/Entities/entities/Course';
import { Admin } from 'src/Entities/entities/Admin';
import { Teacher } from 'src/Entities/entities/Teacher';
import { CourseCategory } from 'src/Entities/entities/CourseCategory';
import { AddCourseDto } from './dto/add_course.dto';
import { DeepPartial } from 'typeorm';
import { CourseRating } from 'src/Entities/entities/CourseRating';
import { Lecture } from 'src/Entities/entities/Lecture';

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
    @InjectRepository(CourseRating)
    private readonly courseRatingRepository: Repository<CourseRating>,
    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,
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
      coverImg: courseDto.CoverImg ?? null,
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

  async getCourseById(courseId: number) {
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

    const rawlectureStats = await this.lectureRepository
      .createQueryBuilder('lecture')
      .select('lecture.lecture_type', 'lecture_type')
      .addSelect('COUNT(lecture.id)', 'count')
      .where('lecture.course_id = :id', { id: courseId })
      .groupBy('lecture.lecture_type')
      .getRawMany();

    const lectureStats: Record<string, number> = {};
      rawlectureStats.forEach((item) => {
      lectureStats[item.lecture_type] = Number(item.count);
    });
    return {
      ...course,
      ratingCount: Number(ratingStats.count) || 0,
      averageRating: Number(ratingStats.average) || 0,
      lectureStats,
    };
  }
}
