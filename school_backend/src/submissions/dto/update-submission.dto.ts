import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateSubmissionDto {
  @IsString()
  @IsOptional()
  textContent?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  grade?: number;

  @IsString()
  @IsOptional()
  teacherFeedback?: string;

  @IsString()
  @IsOptional()
  gradedBy?: string;
}
