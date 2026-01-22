import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
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
}