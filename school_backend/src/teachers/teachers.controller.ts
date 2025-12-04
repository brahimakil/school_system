import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors, UploadedFile, ValidationPipe, UsePipes, BadRequestException, HttpException, HttpStatus, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';
import * as admin from 'firebase-admin';

@Controller('teachers')
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  private async getTeacherIdFromToken(authorization: string): Promise<string> {
    const token = authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);
      return decodedToken.uid;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get('my-classes')
  async getMyClasses(@Headers('authorization') authorization: string) {
    const teacherId = await this.getTeacherIdFromToken(authorization);
    return this.teachersService.getTeacherClasses(teacherId);
  }

  @Get('stats')
  async getStats(@Headers('authorization') authorization: string) {
    const teacherId = await this.getTeacherIdFromToken(authorization);
    return this.teachersService.getTeacherStats(teacherId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const createTeacherDto: CreateTeacherDto = {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phoneNumber: body.phoneNumber,
      subjects: JSON.parse(body.subjects || '[]'),
      status: body.status || 'active',
    };
    return this.teachersService.create(createTeacherDto, file);
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
