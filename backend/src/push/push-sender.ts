import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Página que abre ao tocar na notificação. */
  url: string;
  /** Mesmo tag = substitui a notificação anterior em vez de empilhar. */
  tag?: string;
}

/** Resultado de um envio: `gone` = a inscrição não existe mais (apagar). */
export type PushResult = 'sent' | 'gone' | 'failed';

/**
 * Envio de Web Push com a biblioteca `web-push` (gratuita, código aberto) e chaves VAPID
 * próprias — sem serviço pago. Isolado aqui para os services serem testados sem rede.
 */
@Injectable()
export class PushSender {
  private readonly configured: boolean;

  constructor(configService: ConfigService) {
    const publicKey = configService.get<string>('push.vapidPublicKey');
    const privateKey = configService.get<string>('push.vapidPrivateKey');
    const subject = configService.get<string>('push.vapidSubject');
    this.configured = Boolean(publicKey && privateKey && subject);
    if (this.configured) {
      webpush.setVapidDetails(
        subject as string,
        publicKey as string,
        privateKey as string,
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    try {
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify(payload),
        // Se o aparelho estiver desligado, o serviço de push guarda por até 1 hora.
        { TTL: 3600, urgency: 'high' },
      );
      return 'sent';
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      return statusCode === 404 || statusCode === 410 ? 'gone' : 'failed';
    }
  }
}
