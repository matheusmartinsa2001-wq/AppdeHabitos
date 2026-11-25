import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthRepository } from './health.repository';

export interface HealthStatus {
  status: 'ok';
  database: 'ok';
}

@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  /** Usado para saber se a API está no ar (e para acordá-la no plano gratuito). */
  async check(): Promise<HealthStatus> {
    try {
      await this.repository.ping();
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível');
    }
    return { status: 'ok', database: 'ok' };
  }
}
