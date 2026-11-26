import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, Clock],
})
export class TasksModule {}
