import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { QuizResultsService } from './quiz-results.service';
import { CreateQuizResultDto } from './dto/create-quiz-result.dto';

@Controller('quiz-results')
export class QuizResultsController {
  constructor(private readonly quizResultsService: QuizResultsService) {}

  @Post()
  create(@Body() createQuizResultDto: CreateQuizResultDto) {
    return this.quizResultsService.create(createQuizResultDto);
  }

  @Get('quiz/:quizId')
  findByQuiz(@Param('quizId') quizId: string) {
    return this.quizResultsService.findByQuiz(quizId);
  }

  @Get('quiz/:quizId/student/:studentId')
  findByQuizAndStudent(
    @Param('quizId') quizId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.quizResultsService.findByQuizAndStudent(quizId, studentId);
  }

  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.quizResultsService.findByStudent(studentId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizResultsService.remove(id);
  }
}
