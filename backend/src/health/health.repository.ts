import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Consulta mínima só para saber se o banco responde. */
  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
