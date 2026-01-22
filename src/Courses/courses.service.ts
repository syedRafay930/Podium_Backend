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
      teacher: teacher,
      createdAt: new Date(),
      createdBy: adminId as any,
      coverImg: coverImgUrl,
      languages: courseDto.Languages ?? null,
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

    const rawlectureStats = await this.lecturesRepository
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
