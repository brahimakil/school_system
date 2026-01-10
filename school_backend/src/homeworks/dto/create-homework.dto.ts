import { IsString, IsNotEmpty, IsArray, IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export enum HomeworkStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAST_DUE = 'past_due',
}

export enum AttachmentType {
  VIDEO = 'video',
  PDF = 'pdf',
  IMAGE = 'image',
  OTHER = 'other',
}

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  className: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
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

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsNumber()
  @IsOptional()
  totalMarks?: number;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(AttachmentType)
  @IsOptional()
  attachmentType?: AttachmentType;
}
