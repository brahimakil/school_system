import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsIn, Matches } from 'class-validator';

export interface GradeSection {
  grade: string;
  section: string;
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  className: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsArray()
  @ArrayMinSize(1)
  gradeSections: GradeSection[]; // [{grade: "Grade 10", section: "A"}, {grade: "Grade 11", section: "C"}]

  @IsString()
  @IsNotEmpty()
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format (24-hour)'
  })
  startTime: string; // Format: "07:00", "10:00", etc.

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format (24-hour)'
  })
  endTime: string; // Format: "08:00", "12:00", etc.
}

export class UpdateClassDto {
  @IsString()
  className?: string;

  @IsString()
  teacherId?: string;

  @IsArray()
  gradeSections?: GradeSection[];

  @IsString()
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format (24-hour)'
  })
  startTime?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format (24-hour)'
  })
  endTime?: string;
}
