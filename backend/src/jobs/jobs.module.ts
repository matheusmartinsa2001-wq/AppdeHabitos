import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { WaterModule } from '../water/water.module';
import { JobsController } from './jobs.controller';

/** Disparos do cron externo (lembretes da Água e das Tarefas). */
@Module({
  imports: [WaterModule, TasksModule],
  controllers: [JobsController],
})
export class JobsModule {}
