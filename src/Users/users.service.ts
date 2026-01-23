import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin, Not } from 'typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../Auth/redis.service';
import { Users } from 'src/Entities/entities/Users';
import { UserRole } from 'src/Entities/entities/UserRole';
//import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';
import { CreateStudentDto } from './dto/create-student.dto';
import { EditStudentDto } from './dto/edit-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { EditTeacherDto } from './dto/edit-teacher.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    //private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Users | null> {
    return this.usersRepository.findOne({
      where: { email: email },
      relations: ['role'],      
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await this.usersRepository.update(
        { email: userEmail },
        { hashedPassword: newPassword , updatedAt: new Date() , updatedBy: user},        
      );
    }
  }

  // ==================== STUDENT CRUD ====================

  async createStudent(
    createStudentDto: CreateStudentDto,
    adminId: number,
  ): Promise<Users> {
    // Check if email already exists
    const existingStudent = await this.usersRepository.findOne({
      where: { email: createStudentDto.email },
    });

    if (existingStudent) {
      throw new ConflictException('Email already exists');
    }

    // Get student role (role_id = 3)
    const studentRole = await this.userRoleRepository.findOne({
      where: { id: 3 },
    });

    if (!studentRole) {
      throw new NotFoundException('Student role not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);

    // Create student
    const student = this.usersRepository.create({
      firstName: createStudentDto.firstName,
      lastName: createStudentDto.lastName,
      email: createStudentDto.email,
      hashedPassword,
      contactNumber: createStudentDto.contactNumber || null,
      isActive: createStudentDto.isActive ?? true,
      role: studentRole,
      createdBy: adminId as any,
      createdAt: new Date(),
    });

    return this.usersRepository.save(student);
  }

  async getAllStudents(page: number = 1, limit: number = 10): Promise<any> {
    const [students, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 3 } },
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: students,
      meta: {
        totalItems: total,
        itemCount: students.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getStudentById(studentId: number): Promise<Users> {
    const student = await this.usersRepository.findOne({
      where: { id: studentId, role: { id: 3 } },
      relations: ['role'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async updateStudent(
    studentId: number,
    editStudentDto: EditStudentDto,
    adminId: number,
  ): Promise<Users> {
    const student = await this.getStudentById(studentId);

    // Check if email is being changed and if it already exists
    if (editStudentDto.email && editStudentDto.email !== student.email) {
      const existingStudent = await this.usersRepository.findOne({
        where: { email: editStudentDto.email },
      });

      if (existingStudent) {
        throw new ConflictException('Email already exists');
      }
      student.email = editStudentDto.email;
    }

    if (editStudentDto.firstName) {
      student.firstName = editStudentDto.firstName;
    }

    if (editStudentDto.lastName) {
      student.lastName = editStudentDto.lastName;
    }

    if (editStudentDto.password) {
      student.hashedPassword = await bcrypt.hash(editStudentDto.password, 10);
    }

    if (editStudentDto.contactNumber !== undefined) {
      student.contactNumber = editStudentDto.contactNumber;
    }

    if (editStudentDto.isActive !== undefined) {
      student.isActive = editStudentDto.isActive;
    }

    student.updatedAt = new Date();
    student.updatedBy = adminId as any;

    return this.usersRepository.save(student);
  }

  async deleteStudent(studentId: number, adminId: number): Promise<{ message: string }> {
    const student = await this.getStudentById(studentId);

    student.isDelete = true;
    student.deletedAt = new Date();
    student.deletedBy = adminId as any;

    await this.usersRepository.save(student);

    return { message: `Student ${student.firstName} ${student.lastName} deleted successfully` };
  }

  // ==================== TEACHER CRUD ====================

  async createTeacher(
    createTeacherDto: CreateTeacherDto,
    adminId: number,
  ): Promise<Users> {
    // Check if email already exists
    const existingTeacher = await this.usersRepository.findOne({
      where: { email: createTeacherDto.email },
    });

    if (existingTeacher) {
      throw new ConflictException('Email already exists');
    }

    // Get teacher role (role_id = 2)
    const teacherRole = await this.userRoleRepository.findOne({
      where: { id: 2 },
    });

    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createTeacherDto.password, 10);

    // Create teacher
    const teacher = this.usersRepository.create({
      firstName: createTeacherDto.firstName,
      lastName: createTeacherDto.lastName,
      email: createTeacherDto.email,
      hashedPassword,
      contactNumber: createTeacherDto.contactNumber || null,
      isActive: createTeacherDto.isActive ?? true,
      role: teacherRole,
      createdBy: adminId as any,
      createdAt: new Date(),
    });

    return this.usersRepository.save(teacher);
  }

  async getAllTeachers(page: number = 1, limit: number = 10): Promise<any> {
    const [teachers, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 2 } },
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: teachers,
      meta: {
        totalItems: total,
        itemCount: teachers.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getTeacherById(teacherId: number): Promise<Users> {
    const teacher = await this.usersRepository.findOne({
      where: { id: teacherId, role: { id: 2 } },
      relations: ['role'],
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async updateTeacher(
    teacherId: number,
    editTeacherDto: EditTeacherDto,
    adminId: number,
  ): Promise<Users> {
    const teacher = await this.getTeacherById(teacherId);

    // Check if email is being changed and if it already exists
    if (editTeacherDto.email && editTeacherDto.email !== teacher.email) {
      const existingTeacher = await this.usersRepository.findOne({
        where: { email: editTeacherDto.email },
      });

      if (existingTeacher) {
        throw new ConflictException('Email already exists');
      }
      teacher.email = editTeacherDto.email;
    }

    if (editTeacherDto.firstName) {
      teacher.firstName = editTeacherDto.firstName;
    }

    if (editTeacherDto.lastName) {
      teacher.lastName = editTeacherDto.lastName;
    }

    if (editTeacherDto.password) {
      teacher.hashedPassword = await bcrypt.hash(editTeacherDto.password, 10);
    }

    if (editTeacherDto.contactNumber !== undefined) {
      teacher.contactNumber = editTeacherDto.contactNumber;
    }

    if (editTeacherDto.isActive !== undefined) {
      teacher.isActive = editTeacherDto.isActive;
    }

    teacher.updatedAt = new Date();
    teacher.updatedBy = adminId as any;

    return this.usersRepository.save(teacher);
  }

  async deleteTeacher(teacherId: number, adminId: number): Promise<{ message: string }> {
    const teacher = await this.getTeacherById(teacherId);

    teacher.isDelete = true;
    teacher.deletedAt = new Date();
    teacher.deletedBy = adminId as any;

    await this.usersRepository.save(teacher);

    return { message: `Teacher ${teacher.firstName} ${teacher.lastName} deleted successfully` };
  }
}