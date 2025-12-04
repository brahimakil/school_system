import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common';
import { ClassesService, ClassData } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Body() body: { className: string; teacherId: string; gradeSections: string; dayOfWeek: string; startTime: string; endTime: string }): Promise<ClassData> {
    // Parse gradeSections from JSON string
    const createClassDto: CreateClassDto = {
      ...body,
      gradeSections: typeof body.gradeSections === 'string' ? JSON.parse(body.gradeSections) : body.gradeSections,
    };
    return this.classesService.create(createClassDto);
  }

  @Get()
  async findAll(@Query('grade') grade?: string, @Query('section') section?: string): Promise<{ success: boolean; data: ClassData[] }> {
    let classes: ClassData[];
    if (grade && section) {
      classes = await this.classesService.findByGradeSection(grade, section);
    } else {
      classes = await this.classesService.findAll();
    }
    return { success: true, data: classes };
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ClassData> {
    return this.classesService.findOne(id);
  }

  @Get(':id/students')
  getClassStudents(@Param('id') id: string) {
    return this.classesService.getClassStudents(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { className?: string; teacherId?: string; gradeSections?: string; dayOfWeek?: string; startTime?: string; endTime?: string }
  ): Promise<ClassData> {
    // Parse gradeSections if provided
    const updateClassDto: UpdateClassDto = {
      ...body,
      gradeSections: body.gradeSections && typeof body.gradeSections === 'string' 
        ? JSON.parse(body.gradeSections) 
        : body.gradeSections,
    };
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post('initialize-chat-rooms')
  async initializeChatRooms() {
    return this.classesService.initializeChatRooms();
  }
}
