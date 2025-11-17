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
import { Admin } from 'src/Entities/entities/Admin';
//import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    //private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { email: email },
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.adminRepository.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await this.adminRepository.update(
        { email: userEmail },
        { hashedPassword: newPassword },
      );
    }
  }
}