import { IsDate, IsEmail, IsString } from 'class-validator';

export class SignUpDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsDate()
  date_of_birth: Date;

  @IsString()
  gender: string;
}
