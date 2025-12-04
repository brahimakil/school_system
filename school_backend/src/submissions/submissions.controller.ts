import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Body() createSubmissionDto: CreateSubmissionDto) {
    return this.submissionsService.create(createSubmissionDto);
  }

  @Get('homework/:homeworkId/student/:studentId')
  findByHomeworkAndStudent(
    @Param('homeworkId') homeworkId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.submissionsService.findByHomeworkAndStudent(homeworkId, studentId);
  }

  @Get('homework/:homeworkId')
  findByHomework(@Param('homeworkId') homeworkId: string) {
    return this.submissionsService.findByHomework(homeworkId);
  }

  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.submissionsService.findByStudent(studentId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubmissionDto: UpdateSubmissionDto) {
    return this.submissionsService.update(id, updateSubmissionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.submissionsService.remove(id);
  }
}
