import { ServiceUnavailableException } from '@nestjs/common';
import { HealthRepository } from './health.repository';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('responde ok quando o banco responde', async () => {
    const repository = { ping: jest.fn().mockResolvedValue(undefined) };
    const service = new HealthService(
      repository as unknown as HealthRepository,
    );
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('banco fora do ar vira 503 com mensagem em português', async () => {
    const repository = {
      ping: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    };
    const service = new HealthService(
      repository as unknown as HealthRepository,
    );
    await expect(service.check()).rejects.toThrow(
      new ServiceUnavailableException('Banco de dados indisponível'),
    );
  });
});
