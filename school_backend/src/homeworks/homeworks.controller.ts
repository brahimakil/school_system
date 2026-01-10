import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeworksService } from './homeworks.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Controller('homeworks')
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) { }

  @Post()
  @UseInterceptors(FileInterceptor('attachment'))
  create(
    @Body() createHomeworkDto: CreateHomeworkDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.homeworksService.create(createHomeworkDto, file);
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
  @UseInterceptors(FileInterceptor('attachment'))
  update(
    @Param('id') id: string,
    @Body() updateHomeworkDto: UpdateHomeworkDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.homeworksService.update(id, updateHomeworkDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homeworksService.remove(id);
  }
}
