import { IsEmail, IsNotEmpty, IsArray, IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export interface GradeSection {
  grade: string;
  section: string;
}

export class CreateStudentDto {
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

  @IsNotEmpty()
  currentGrade: GradeSection;

  @IsArray()
  @IsNotEmpty()
  passedGrades: GradeSection[];

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'pending'])
  status?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;
}

export class UpdateStudentDto {
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
  currentGrade?: GradeSection;

  @IsOptional()
  @IsArray()
  passedGrades?: GradeSection[];

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'pending'])
  status?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;
}
