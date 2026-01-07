import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudentsModule } from './students/students.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { HomeworksModule } from './homeworks/homeworks.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { UploadsModule } from './uploads/uploads.module';
import { QuizResultsModule } from './quiz-results/quiz-results.module';
import { ChatModule } from './chat/chat.module';
import { CoursesModule } from './courses/courses.module';
import { AiModule } from './ai/ai.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    ActivityLogModule,
    AuthModule,
    TeachersModule,
    StudentsModule,
    ClassesModule,
    SubjectsModule,
    QuizzesModule,
    HomeworksModule,
    SubmissionsModule,
    UploadsModule,
    QuizResultsModule,
    ChatModule,
    CoursesModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
