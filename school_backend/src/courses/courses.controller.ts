import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.coursesService.create(createCourseDto, file);
  }

  @Get()
  findAll(@Query('grade') grade?: string, @Query('section') section?: string) {
    return this.coursesService.findAll(grade, section);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Get('class/:classId')
  findByClass(@Param('classId') classId: string) {
    return this.coursesService.findByClass(classId);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('attachment'))
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.coursesService.update(id, updateCourseDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
