import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const createStudentDto: CreateStudentDto = {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phoneNumber: body.phoneNumber,
      currentGrade: JSON.parse(body.currentGrade || '{"grade":"","section":""}'),
      passedGrades: JSON.parse(body.passedGrades || '[]'),
      status: body.status || 'active',
    };
    return this.studentsService.create(createStudentDto, file);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('photo'))
  async update(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const updateStudentDto: UpdateStudentDto = {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phoneNumber: body.phoneNumber,
      currentGrade: body.currentGrade ? JSON.parse(body.currentGrade) : undefined,
      passedGrades: body.passedGrades ? JSON.parse(body.passedGrades) : undefined,
      status: body.status,
    };
    return this.studentsService.update(id, updateStudentDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Post(':id/test-gemini-key')
  async testGeminiKey(@Param('id') id: string, @Body('apiKey') apiKey: string) {
    return this.studentsService.testGeminiApiKey(apiKey);
  }

  @Post(':id/save-gemini-key')
  async saveGeminiKey(@Param('id') id: string, @Body('apiKey') apiKey: string) {
    return this.studentsService.saveGeminiApiKey(id, apiKey);
  }
}
