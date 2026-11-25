import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { PushModule } from '../push/push.module';
import { ReminderCache } from './reminder-cache';
import { WaterJobsController } from './water-jobs.controller';
import { WaterReminderDispatchService } from './water-reminder-dispatch.service';
import { WaterTodayController } from './water-today.controller';
import { WaterTodayService } from './water-today.service';
import { WaterController } from './water.controller';
import { WaterRepository } from './water.repository';
import { WaterService } from './water.service';

@Module({
  imports: [PushModule],
  controllers: [WaterController, WaterTodayController, WaterJobsController],
  providers: [
    WaterService,
    WaterTodayService,
    WaterReminderDispatchService,
    WaterRepository,
    ReminderCache,
    Clock,
  ],
})
export class WaterModule {}
