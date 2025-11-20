import { IsString, IsNotEmpty, IsArray, IsDateString, IsEnum } from 'class-validator';

export enum HomeworkStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAST_DUE = 'past_due',
}

export class CreateHomeworkDto {
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
  subject: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  dueDate: string;

  @IsEnum(HomeworkStatus)
  status: HomeworkStatus;
}
