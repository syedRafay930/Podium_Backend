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
import { MailService } from 'src/Nodemailer/mailer.service';
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
    private readonly mailService: MailService,
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

  // Helper method to generate password reset token and link
  private async generateResetLink(email: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: email },
      {
        secret: this.configService.get<string>('RESET_SECRET'),
        expiresIn: '5m',
      },
    );

    await this.redisService.setValue(`forgot:${token}`, email, 300); // 5 mins

    const resetLink = `http://localhost:3000/resetpassword/${token}`;
    return resetLink;
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
    const tempPassword = `${Date.now().toString(36)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

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

    const savedStudent = await this.usersRepository.save(student);

    // Send onboarding email with credentials
    try {
      const resetLink = await this.generateResetLink(createStudentDto.email);
      await this.mailService.sendTemplatedMail(
        createStudentDto.email,
        'Welcome to Podium - Student Account Created',
        'user-onboarded',
        {
          userName: `${createStudentDto.firstName} ${createStudentDto.lastName}`,
          userRole: 'Student',
          email: createStudentDto.email,
          password: tempPassword,
          resetLink,
        },
      );
    } catch (error) {
      console.error('Failed to send student onboarding email:', error);
    }

    return savedStudent;
  }

  async getAllStudents(page: number = 1, limit: number = 10): Promise<any> {
    const [students, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 3 }, isDelete: false },
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

  async getUserById(userId: number): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(
    userId: number,
    editStudentDto: EditStudentDto,
    adminId: number,
  ): Promise<Users> {
    const user = await this.getUserById(userId);
    // Check if email is being changed and if it already exists
    if (editStudentDto.email && editStudentDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: editStudentDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
      user.email = editStudentDto.email;
    }

    if (editStudentDto.firstName) {
      user.firstName = editStudentDto.firstName;
    }

    if (editStudentDto.lastName) {
      user.lastName = editStudentDto.lastName;
    }

    if (editStudentDto.password) {
      user.hashedPassword = await bcrypt.hash(editStudentDto.password, 12);
    }

    if (editStudentDto.contactNumber !== undefined) {
      user.contactNumber = editStudentDto.contactNumber;
    }

    if (editStudentDto.isActive !== undefined) {
      user.isActive = editStudentDto.isActive;
    }

    user.updatedAt = new Date();
    user.updatedBy = adminId as any;
    return this.usersRepository.save(user);
  }

  async deleteStudent(studentId: number, adminId: number): Promise<{ message: string }> {
    const student = await this.getUserById(studentId);

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

    // Generate temporary password
    const tempPassword = `${Date.now().toString(36)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

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

    const savedTeacher = await this.usersRepository.save(teacher);

    // Send onboarding email with credentials
    try {
      const resetLink = await this.generateResetLink(createTeacherDto.email);
      await this.mailService.sendTemplatedMail(
        createTeacherDto.email,
        'Welcome to Podium - Teacher Account Created',
        'user-onboarded',
        {
          userName: `${createTeacherDto.firstName} ${createTeacherDto.lastName}`,
          userRole: 'Teacher',
          email: createTeacherDto.email,
          password: tempPassword,
          resetLink,
        },
      );
    } catch (error) {
      console.error('Failed to send teacher onboarding email:', error);
      // Don't throw error - teacher creation should succeed even if email fails
    }

    return savedTeacher;
  }

  async getAllTeachers(page: number = 1, limit: number = 10): Promise<any> {
    const [teachers, total] = await this.usersRepository.findAndCount({
      where: { role: { id: 2 }, isDelete: false },
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