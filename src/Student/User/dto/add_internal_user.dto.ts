import { IsDate, IsDateString, IsEmail, IsString } from 'class-validator';

export class AddInternalUserDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsDateString()
  date_of_birth: string;

  @IsString()
  gender: string;
}
