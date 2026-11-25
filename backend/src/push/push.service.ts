import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PushStatusDto,
  PushSubscriptionDto,
} from './dto/push-subscription.dto';
import { PushPayload, PushSender } from './push-sender';
import { PushRepository } from './push.repository';

export interface BroadcastResult {
  sent: number;
  removed: number;
  failed: number;
}

/** Inscrições de push (um registro por aparelho) e envio para todos os aparelhos. */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly repository: PushRepository,
    private readonly sender: PushSender,
    private readonly configService: ConfigService,
  ) {}

  getStatus(): PushStatusDto {
    const enabled = this.sender.isConfigured();
    return {
      enabled,
      publicKey: enabled
        ? (this.configService.get<string>('push.vapidPublicKey') ?? null)
        : null,
    };
  }

  async subscribe(userId: string, dto: PushSubscriptionDto): Promise<void> {
    this.ensureEnabled();
    await this.repository.upsertSubscription({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.repository.deleteByEndpoint(endpoint);
  }

  /** Envia para todos os aparelhos inscritos e apaga as inscrições que expiraram. */
  async broadcast(payload: PushPayload): Promise<BroadcastResult> {
    const result: BroadcastResult = { sent: 0, removed: 0, failed: 0 };
    if (!this.sender.isConfigured()) {
      this.logger.warn('Push sem chaves VAPID: nada enviado');
      return result;
    }
    const subscriptions = await this.repository.listAll();
    for (const subscription of subscriptions) {
      const outcome = await this.sender.send(subscription, payload);
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'gone') {
        await this.repository.deleteById(subscription.id);
        result.removed += 1;
      } else result.failed += 1;
    }
    if (result.failed > 0) {
      this.logger.warn(`Push: ${result.failed} envio(s) falharam`);
    }
    return result;
  }

  async sendTest(): Promise<BroadcastResult> {
    this.ensureEnabled();
    return this.broadcast({
      title: 'App de Hábitos',
      body: 'Notificações funcionando 👍',
      url: '/',
      tag: 'teste',
    });
  }

  private ensureEnabled(): void {
    if (!this.sender.isConfigured()) {
      throw new ServiceUnavailableException(
        'Notificações não configuradas no servidor',
      );
    }
  }
}
