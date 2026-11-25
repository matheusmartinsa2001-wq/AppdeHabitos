import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PushRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Mesmo aparelho inscrito de novo (endpoint igual): só atualiza as chaves. */
  upsertSubscription(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: data,
      update: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
    });
  }

  deleteByEndpoint(endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  deleteById(id: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { id } });
  }

  listAll() {
    return this.prisma.pushSubscription.findMany();
  }

  countAll() {
    return this.prisma.pushSubscription.count();
  }
}
