import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { WaterTodayController } from './water-today.controller';
import { WaterTodayService } from './water-today.service';
import { WaterController } from './water.controller';
import { WaterRepository } from './water.repository';
import { WaterService } from './water.service';

@Module({
  controllers: [WaterController, WaterTodayController],
  providers: [WaterService, WaterTodayService, WaterRepository, Clock],
})
export class WaterModule {}
