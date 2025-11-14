import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../Auth/redis.service';
import { Student } from 'src/Entities/entities/Student';
import { AddInternalUserDto } from './dto/add_internal_user.dto';

//import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Student)
    private readonly stdRepository: Repository<Student>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    //private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Student | null> {
    return this.stdRepository.findOne({
      where: { email: email },
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.stdRepository.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await this.stdRepository.update(
        { email: userEmail },
        { hashedPassword: newPassword },
      );
    }
  }

  async createInternalUser(dto: AddInternalUserDto) {
    // 1. duplicate check
    const exists = await this.stdRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email or username already exists');
    }

    // 2. generate temp password
    const tempPassword = dto.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 3. create user
    const user = this.stdRepository.create({
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email,
      hashedPassword: hashedPassword,
      dateOfBirth: dto.date_of_birth,
      gender: dto.gender,
      isActive: true,
      isDelete: false,
      createdAt: new Date(),
    });

    return this.stdRepository.save(user);
  }

  //   async generateJwtTokenAndResetLink(user: Users) {
  //     const users = await this.findByEmail(user.email);
  //     if (!users) throw new UnauthorizedException('User not found');

  //     const token = this.jwtService.sign(
  //       { sub: users.email },
  //       {
  //         secret: this.configService.get<string>('RESET_SECRET'),
  //         expiresIn: '5m',
  //       },
  //     );

  //     await this.redisService.setValue(`forgot:${token}`, users.email, 300); // 5 mins

  //     const resetLink = `http://localhost:5173/reset-password?token=${token}&createNewPassword=true`;

  //     await this.mailService.sendTemplatedMail(
  //       users.email,
  //       'You’ve been invited to JourneyGo!',
  //       'user-invitation',
  //       {
  //         username: users.firstName,
  //         userId: users.email,
  //         setPasswordLink: resetLink,
  //       },
  //     );

  //     return {
  //       message: 'Reset link sent to email',
  //     };
  //   }

  //   async editInternalUserIncludingSelf(id: number, dto: EditInternalUserDto) {
  //     const user = await this.usersRepository.findOne({
  //       where: { id: id },
  //       relations: ['role'],
  //     });
  //     if (!user) throw new NotFoundException('User not found');

  //     let newRoleId = user.role.id;
  //     let selectedRole;

  //     if (dto.Role) {
  //       const role = await this.rolesRepository.findOne({
  //         where: { roleName: dto.Role },
  //       });
  //       if (!role) throw new NotFoundException('Role not found');
  //       if (role.roleName.toLowerCase() === 'superadmin') {
  //         throw new ConflictException('Cannot assign SuperAdmin role');
  //       }
  //       newRoleId = role.id;
  //       selectedRole = role;
  //     } else {
  //       selectedRole = await this.rolesRepository.findOne({
  //         where: { id: user.role.id },
  //       });
  //     }

  //     const updated = Object.assign(user, {
  //       firstName: dto.FirstName ?? user.firstName,
  //       lastName: dto.LastName ?? user.lastName,
  //       address: dto.Address ?? user.address,
  //       phoneNumber: dto.Contact ? Number(dto.Contact) : user.phoneNumber,
  //       role_id: newRoleId, //  updated here
  //       isActive: dto.isActive ?? user.isActive,
  //       state: dto.state ?? user.state,
  //       country: dto.country ?? user.country,
  //       city: dto.city ?? user.city,
  //       updatedAt: new Date(),
  //     });

  //     await this.usersRepository.save(updated);

  //     return {
  //       ...updated,
  //       role: selectedRole ? { name: selectedRole.roleName } : null,
  //     };
  //   }

  //   async getInternalUsersExcludingSelf(
  //     currentUserId: number,
  //     currentUserRoleId: number,
  //     page: number,
  //     limit: number,
  //     filterRole?: string,
  //     filterStatus?: 'active' | 'inactive',
  //     search?: string,
  //   ) {
  //     const skip = (page - 1) * limit;
  //     const isSuperAdmin = currentUserRoleId === 1;

  //     const whereCondition: any = {
  //       id: Not(currentUserId),
  //     };

  //     if (filterStatus === 'active') {
  //       whereCondition.isdeactive = false;
  //     } else if (filterStatus === 'inactive') {
  //       whereCondition.isdeactive = true;
  //     }

  //     if (filterRole) {
  //       whereCondition.role = { name: filterRole };
  //     }

  //     if (search) {
  //       whereCondition.admin_name = ILike(`%${search}%`);
  //       whereCondition.admin_email = ILike(`%${search}%`);
  //       whereCondition.admin_contact = ILike(`%${search}%`);
  //     }

  //     if (!isSuperAdmin) {
  //       whereCondition.isdelete = false;
  //     }

  //     const [data, total] = await this.usersRepository.findAndCount({
  //       where: whereCondition,
  //       relations: ['role'],
  //       order: {
  //         id: 'DESC',
  //       },
  //       skip,
  //       take: limit,
  //     });

  //     return {
  //       data,
  //       page,
  //       limit,
  //       total,
  //       totalPages: Math.ceil(total / limit),
  //     };
  //   }
  //     async softDeleteUser(id: number, is_delete: boolean) {
  //     const user = await this.usersRepository.findOne({
  //       where: { id: id },
  //     });
  //     if (!user) throw new NotFoundException('User not found');

  //     if (is_delete) {
  //       await this.usersRepository.update(id, {
  //         isDelete: true,
  //         deletedAt: new Date(),
  //       });
  //     } else {
  //       await this.usersRepository.update(id, {
  //         isDelete: false,
  //         deletedAt: null,
  //       });
  //     }

  //     return {
  //       message: 'User marked for deletion. Will be deleted in 10 days.',
  //       id: id,
  //     };
  //   }
}
