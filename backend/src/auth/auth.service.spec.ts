import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthRepository } from './auth.repository';
import { AuthService, CONCURRENT_REFRESH_GRACE_MS } from './auth.service';

const configService = {
  getOrThrow: (key: string) => {
    if (key === 'jwt.refreshExpiresIn') return '30d';
    throw new Error(`config ausente: ${key}`);
  },
} as unknown as ConfigService;

const ACCOUNT = {
  id: 'conta-1',
  passwordHash: bcrypt.hashSync('senha-certa', 4),
  createdAt: new Date(),
};

describe('AuthService', () => {
  let repository: Record<string, jest.Mock>;
  let service: AuthService;

  beforeEach(() => {
    repository = {
      findAccount: jest.fn().mockResolvedValue(ACCOUNT),
      findUserById: jest.fn().mockResolvedValue(ACCOUNT),
      createRefreshToken: jest.fn().mockResolvedValue({}),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue({}),
      revokeAllRefreshTokens: jest.fn().mockResolvedValue({}),
    };
    service = new AuthService(
      repository as unknown as AuthRepository,
      new JwtService({
        secret: 'segredo-de-teste',
        signOptions: { expiresIn: '15m' },
      }),
      configService,
    );
  });

  describe('login (só senha)', () => {
    it('senha certa abre a sessão e grava só o hash do refresh token', async () => {
      const result = await service.login('senha-certa');

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      const [userId, storedHash, expiresAt] =
        repository.createRefreshToken.mock.calls[0];
      expect(userId).toBe('conta-1');
      expect(storedHash).not.toBe(result.refreshToken);
      expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
      const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29.9);
    });

    it('senha errada recebe 401 "Senha incorreta" e nada é gravado', async () => {
      await expect(service.login('senha-errada')).rejects.toThrow(
        new UnauthorizedException('Senha incorreta'),
      );
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('sem conta configurada, a mensagem é a mesma da senha errada', async () => {
      repository.findAccount.mockResolvedValue(null);
      await expect(service.login('qualquer')).rejects.toThrow(
        new UnauthorizedException('Senha incorreta'),
      );
    });
  });

  describe('refresh (rotação)', () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      id: 'rt-1',
      userId: 'conta-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    });

    it('token válido é revogado e trocado por um novo', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(stored());

      const result = await service.refresh('token-atual');

      expect(repository.revokeRefreshToken).toHaveBeenCalledWith('rt-1');
      expect(repository.createRefreshToken).toHaveBeenCalledTimes(1);
      expect(result.refreshToken).not.toBe('token-atual');
    });

    it('sem cookie: 401', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('token desconhecido: 401', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(null);
      await expect(service.refresh('inventado')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('token expirado: 401 sem criar sessão nova', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(
        stored({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.refresh('velho')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('reuso de token já trocado encerra todas as sessões', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(
        stored({
          revokedAt: new Date(Date.now() - CONCURRENT_REFRESH_GRACE_MS - 1000),
        }),
      );
      await expect(service.refresh('reusado')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.revokeAllRefreshTokens).toHaveBeenCalledWith('conta-1');
    });

    it('renovação simultânea (trocado há instantes) recusa só esta requisição', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(
        stored({ revokedAt: new Date() }),
      );
      await expect(service.refresh('simultaneo')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.revokeAllRefreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoga o refresh token atual', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
      });
      await service.logout('token');
      expect(repository.revokeRefreshToken).toHaveBeenCalledWith('rt-1');
    });

    it('sem cookie não faz nada', async () => {
      await service.logout(undefined);
      expect(repository.findRefreshTokenByHash).not.toHaveBeenCalled();
    });
  });
});
