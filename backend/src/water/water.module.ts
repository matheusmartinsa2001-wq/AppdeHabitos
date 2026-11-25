import { Module } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { WaterController } from './water.controller';
import { WaterRepository } from './water.repository';
import { WaterService } from './water.service';

@Module({
  controllers: [WaterController],
  providers: [WaterService, WaterRepository, Clock],
})
export class WaterModule {}
