import { Module } from '@nestjs/common';
import { PushSender } from './push-sender';
import { PushController } from './push.controller';
import { PushRepository } from './push.repository';
import { PushService } from './push.service';

@Module({
  controllers: [PushController],
  providers: [PushService, PushRepository, PushSender],
  exports: [PushService],
})
export class PushModule {}
