import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { PushModule } from '../push/push.module';
import { ReminderCache } from './reminder-cache';
import { WaterHistoryController } from './water-history.controller';
import { WaterHistoryService } from './water-history.service';
import { WaterReminderDispatchService } from './water-reminder-dispatch.service';
import { WaterTodayController } from './water-today.controller';
import { WaterTodayService } from './water-today.service';
import { WaterController } from './water.controller';
import { WaterRepository } from './water.repository';
import { WaterService } from './water.service';

@Module({
  imports: [PushModule],
  controllers: [WaterController, WaterTodayController, WaterHistoryController],
  providers: [
    WaterService,
    WaterTodayService,
    WaterHistoryService,
    WaterReminderDispatchService,
    WaterRepository,
    ReminderCache,
    Clock,
  ],
  exports: [WaterReminderDispatchService],
})
export class WaterModule {}
