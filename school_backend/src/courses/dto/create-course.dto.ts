import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export enum CourseStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum AttachmentType {
  VIDEO = 'video',
  PDF = 'pdf',
  IMAGE = 'image',
  OTHER = 'other',
}

export class CreateCourseDto {
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

  @IsEnum(CourseStatus)
  status: CourseStatus;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(AttachmentType)
  @IsOptional()
  attachmentType?: AttachmentType;
}
