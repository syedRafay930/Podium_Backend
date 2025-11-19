import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsNumber,
  MaxLength,
} from 'class-validator';

export class AddCourseDto {
  @IsNotEmpty()
  @IsString()
  CourseName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  ShortDescription: string;

  @IsNotEmpty()
  @IsString()
  Price: string;

  @IsOptional()
  @IsString()
  LongDescription: string;

  @IsNotEmpty()
  @IsNumber()
  CourseCategoryId: number;

  @IsOptional()
  @IsNumber()
  TeacherId: number;

  @IsNotEmpty()
  @IsString()
  CoverImg: string;

}
