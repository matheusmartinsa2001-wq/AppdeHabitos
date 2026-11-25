import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';

export type AccountSyncResult = 'created' | 'updated' | 'unchanged' | 'skipped';

/**
 * Garante a conta única a partir de `ADMIN_PASSWORD`, toda vez que o backend sobe.
 *
 * Por que no boot e não num seed: os planos gratuitos de hospedagem não dão terminal para
 * rodar comandos. Assim, criar a conta ou trocar a senha é só mudar a variável de ambiente
 * no painel do provedor e reiniciar. A senha nunca é gravada: só o hash bcrypt.
 * Trocar a senha encerra todas as sessões abertas. Ver docs/decisoes.md (Etapa 5).
 */
@Injectable()
export class AccountBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AccountBootstrapService.name);

  constructor(
    private readonly repository: AuthRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.syncAccount();
    const messages: Record<AccountSyncResult, string> = {
      created: 'Conta criada a partir de ADMIN_PASSWORD',
      updated: 'Senha da conta atualizada a partir de ADMIN_PASSWORD',
      unchanged: 'Conta pronta',
      skipped:
        'ADMIN_PASSWORD não definida: a conta existente (se houver) continua valendo',
    };
    if (result === 'skipped') this.logger.warn(messages[result]);
    else this.logger.log(messages[result]);
  }

  async syncAccount(): Promise<AccountSyncResult> {
    const password = this.configService.get<string>('security.adminPassword');
    if (!password) return 'skipped';

    const rounds =
      this.configService.get<number>('security.bcryptSaltRounds') ?? 10;
    const account = await this.repository.findAccount();

    if (!account) {
      await this.repository.createAccount(await bcrypt.hash(password, rounds));
      return 'created';
    }
    if (await bcrypt.compare(password, account.passwordHash)) {
      return 'unchanged';
    }
    await this.repository.updatePasswordHash(
      account.id,
      await bcrypt.hash(password, rounds),
    );
    await this.repository.revokeAllRefreshTokens(account.id);
    return 'updated';
  }
}
