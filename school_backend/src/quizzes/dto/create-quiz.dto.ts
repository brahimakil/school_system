import { IsString, IsNotEmpty, IsArray, IsDateString, IsEnum, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuizStatus {
  PENDING = 'pending',
  AVAILABLE = 'available',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class QuizQuestion {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @IsString({ each: true })
  answers: string[]; // Array of 4 answers

  @IsString()
  @IsNotEmpty()
  correctAnswer: string; // 'A', 'B', 'C', or 'D'

  @IsNumber()
  @Min(0)
  marks: number;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  className: string;

  @IsArray()
  @IsString({ each: true })
  gradeSections: string[]; // Array of "Grade X - Section Y"

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsNumber()
  @Min(1)
  quizDurationMinutes: number; // Time available after student opens quiz

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestion)
  questions: QuizQuestion[];

  @IsEnum(QuizStatus)
  status: QuizStatus;
}
