import { Module } from '@nestjs/common';
import { QuizResultsController } from './quiz-results.controller';
import { QuizResultsService } from './quiz-results.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [QuizResultsController],
  providers: [QuizResultsService],
  exports: [QuizResultsService],
})
export class QuizResultsModule {}
