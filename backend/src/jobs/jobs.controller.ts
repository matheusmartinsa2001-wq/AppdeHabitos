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
import { TaskReminderDispatchService } from '../tasks/task-reminder-dispatch.service';
import { WaterReminderDispatchService } from '../water/water-reminder-dispatch.service';

export interface JobsDispatchResult {
  /** Horários dos lembretes de água notificados nesta chamada. */
  notified: string[];
  /** "HH:MM título" das tarefas notificadas nesta chamada (Etapa 15). */
  tasks: string[];
}

/**
 * Chamado a cada minuto pelo cron externo gratuito (cron-job.org). Fora do login: protegido
 * pelo segredo `CRON_SECRET` no header `X-Cron-Secret`. Ver docs/decisoes.md (Etapa 9).
 * Desde a Etapa 15, a mesma chamada dispara também os lembretes das tarefas (o endereço
 * continua o mesmo, para não mexer no cron-job.org).
 */
@ApiExcludeController()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly waterDispatch: WaterReminderDispatchService,
    private readonly taskDispatch: TaskReminderDispatchService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('water-reminders')
  @HttpCode(HttpStatus.OK)
  async dispatch(
    @Headers('x-cron-secret') secret: string | undefined,
  ): Promise<JobsDispatchResult> {
    this.ensureCronSecret(secret);
    const { notified } = await this.waterDispatch.dispatchDue();
    const tasks = await this.taskDispatch.dispatchDue();
    return { notified, tasks };
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
