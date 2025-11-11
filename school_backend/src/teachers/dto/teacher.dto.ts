import { IsEmail, IsNotEmpty, IsArray, IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class CreateTeacherDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsArray()
  @IsNotEmpty()
  professions: string[];

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'pending'])
  status?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsArray()
  professions?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'pending'])
  status?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
