import { IsString, IsNotEmpty, IsArray, IsDateString, IsEnum, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizStatus, QuizQuestion } from './create-quiz.dto';

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  classId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  className?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gradeSections?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quizDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestion)
  questions?: QuizQuestion[];

  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;
}
