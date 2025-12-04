import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { HomeworksService } from './homeworks.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Controller('homeworks')
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) {}

  @Post()
  create(@Body() createHomeworkDto: CreateHomeworkDto) {
    return this.homeworksService.create(createHomeworkDto);
  }

  @Get()
  findAll(@Query('grade') grade?: string, @Query('section') section?: string) {
    return this.homeworksService.findAll(grade, section);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.homeworksService.findOne(id);
  }

  @Get('class/:classId')
  findByClass(@Param('classId') classId: string) {
    return this.homeworksService.findByClass(classId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHomeworkDto: UpdateHomeworkDto) {
    return this.homeworksService.update(id, updateHomeworkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homeworksService.remove(id);
  }
}
