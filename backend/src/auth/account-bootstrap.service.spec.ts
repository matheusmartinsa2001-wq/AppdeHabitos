import type { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AccountBootstrapService } from './account-bootstrap.service';
import type { AuthRepository } from './auth.repository';

function configWith(adminPassword: string | undefined): ConfigService {
  const values: Record<string, unknown> = {
    'security.adminPassword': adminPassword,
    'security.bcryptSaltRounds': 4,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('AccountBootstrapService (conta única a partir de ADMIN_PASSWORD)', () => {
  let repository: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      findAccount: jest.fn().mockResolvedValue(null),
      createAccount: jest.fn().mockResolvedValue({}),
      updatePasswordHash: jest.fn().mockResolvedValue({}),
      revokeAllRefreshTokens: jest.fn().mockResolvedValue({}),
    };
  });

  const build = (password: string | undefined) =>
    new AccountBootstrapService(
      repository as unknown as AuthRepository,
      configWith(password),
    );

  it('sem conta: cria guardando só o hash da senha', async () => {
    await expect(build('senha-nova-123').syncAccount()).resolves.toBe(
      'created',
    );
    const [hash] = repository.createAccount.mock.calls[0];
    expect(hash).not.toContain('senha-nova-123');
    expect(await bcrypt.compare('senha-nova-123', hash)).toBe(true);
  });

  it('mesma senha: não muda nada', async () => {
    repository.findAccount.mockResolvedValue({
      id: 'conta-1',
      passwordHash: bcrypt.hashSync('senha-atual-1', 4),
    });
    await expect(build('senha-atual-1').syncAccount()).resolves.toBe(
      'unchanged',
    );
    expect(repository.updatePasswordHash).not.toHaveBeenCalled();
    expect(repository.revokeAllRefreshTokens).not.toHaveBeenCalled();
  });

  it('senha trocada na variável: atualiza o hash e encerra as sessões abertas', async () => {
    repository.findAccount.mockResolvedValue({
      id: 'conta-1',
      passwordHash: bcrypt.hashSync('senha-antiga-1', 4),
    });
    await expect(build('senha-nova-123').syncAccount()).resolves.toBe(
      'updated',
    );
    const [, hash] = repository.updatePasswordHash.mock.calls[0];
    expect(await bcrypt.compare('senha-nova-123', hash)).toBe(true);
    expect(repository.revokeAllRefreshTokens).toHaveBeenCalledWith('conta-1');
  });

  it('sem ADMIN_PASSWORD: não mexe no banco', async () => {
    await expect(build(undefined).syncAccount()).resolves.toBe('skipped');
    expect(repository.findAccount).not.toHaveBeenCalled();
  });
});
