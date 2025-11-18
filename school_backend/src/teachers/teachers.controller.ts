import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors, UploadedFile, ValidationPipe, UsePipes, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    try {
      const createTeacherDto: CreateTeacherDto = {
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        phoneNumber: body.phoneNumber,
        subjects: JSON.parse(body.subjects || '[]'),
        status: body.status || 'active',
      };
      return this.teachersService.create(createTeacherDto, file);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create teacher',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  async update(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const updateTeacherDto: UpdateTeacherDto = {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phoneNumber: body.phoneNumber,
      subjects: body.subjects ? JSON.parse(body.subjects) : undefined,
      status: body.status,
    };
    return this.teachersService.update(id, updateTeacherDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
