import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import {
  DispatchResult,
  WaterReminderDispatchService,
} from './water-reminder-dispatch.service';

/**
 * Chamado a cada minuto pelo cron externo gratuito (cron-job.org). Fora do login: protegido
 * pelo segredo `CRON_SECRET` no header `X-Cron-Secret`. Ver docs/decisoes.md (Etapa 9).
 */
@ApiExcludeController()
@Controller('jobs')
export class WaterJobsController {
  constructor(
    private readonly dispatchService: WaterReminderDispatchService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('water-reminders')
  @HttpCode(HttpStatus.OK)
  dispatch(
    @Headers('x-cron-secret') secret: string | undefined,
  ): Promise<DispatchResult> {
    this.ensureCronSecret(secret);
    return this.dispatchService.dispatchDue();
  }

  private ensureCronSecret(received: string | undefined): void {
    const expected = this.configService.get<string>('push.cronSecret');
    const ok =
      !!expected &&
      !!received &&
      received.length === expected.length &&
      timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    if (!ok) {
      throw new UnauthorizedException();
    }
  }
}
