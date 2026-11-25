import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PushSender } from './push-sender';
import type { PushRepository } from './push.repository';
import { PushService } from './push.service';

const config = {
  get: (key: string) =>
    key === 'push.vapidPublicKey' ? 'chave-publica' : undefined,
} as unknown as ConfigService;

const payload = { title: 't', body: 'b', url: '/' };

describe('PushService', () => {
  let repository: Record<string, jest.Mock>;
  let sender: { isConfigured: jest.Mock; send: jest.Mock };
  let service: PushService;

  beforeEach(() => {
    repository = {
      upsertSubscription: jest.fn().mockResolvedValue({}),
      deleteByEndpoint: jest.fn().mockResolvedValue({}),
      deleteById: jest.fn().mockResolvedValue({}),
      listAll: jest.fn().mockResolvedValue([]),
    };
    sender = { isConfigured: jest.fn().mockReturnValue(true), send: jest.fn() };
    service = new PushService(
      repository as unknown as PushRepository,
      sender as unknown as PushSender,
      config,
    );
  });

  it('status traz a chave pública quando o servidor tem as chaves', () => {
    expect(service.getStatus()).toEqual({
      enabled: true,
      publicKey: 'chave-publica',
    });
    sender.isConfigured.mockReturnValue(false);
    expect(service.getStatus()).toEqual({ enabled: false, publicKey: null });
  });

  it('envia para todos os aparelhos e apaga as inscrições que expiraram', async () => {
    repository.listAll.mockResolvedValue([
      { id: 'a', endpoint: 'https://push/a', p256dh: 'p', auth: 'x' },
      { id: 'b', endpoint: 'https://push/b', p256dh: 'p', auth: 'x' },
      { id: 'c', endpoint: 'https://push/c', p256dh: 'p', auth: 'x' },
    ]);
    sender.send
      .mockResolvedValueOnce('sent')
      .mockResolvedValueOnce('gone')
      .mockResolvedValueOnce('failed');

    await expect(service.broadcast(payload)).resolves.toEqual({
      sent: 1,
      removed: 1,
      failed: 1,
    });
    expect(repository.deleteById).toHaveBeenCalledWith('b');
    expect(repository.deleteById).toHaveBeenCalledTimes(1);
  });

  it('sem chaves VAPID: não envia nada e não quebra', async () => {
    sender.isConfigured.mockReturnValue(false);
    await expect(service.broadcast(payload)).resolves.toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
    });
    expect(repository.listAll).not.toHaveBeenCalled();
  });

  it('sem chaves VAPID: inscrever recebe 503 com mensagem', async () => {
    sender.isConfigured.mockReturnValue(false);
    await expect(
      service.subscribe('u', {
        endpoint: 'https://push/a',
        keys: { p256dh: 'p', auth: 'x' },
      }),
    ).rejects.toThrow(
      new ServiceUnavailableException(
        'Notificações não configuradas no servidor',
      ),
    );
  });
});
