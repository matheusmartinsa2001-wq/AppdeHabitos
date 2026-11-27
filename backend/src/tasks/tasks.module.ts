import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { PushModule } from '../push/push.module';
import { TaskReminderCache } from './task-reminder-cache';
import { TaskReminderDispatchService } from './task-reminder-dispatch.service';
import { TasksHistoryService } from './tasks-history.service';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [PushModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksHistoryService,
    TasksRepository,
    TaskReminderCache,
    TaskReminderDispatchService,
    Clock,
  ],
  exports: [TaskReminderDispatchService],
})
export class TasksModule {}
