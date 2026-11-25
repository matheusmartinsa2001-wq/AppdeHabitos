import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import ms from 'ms';
import type { StringValue } from 'ms';
import { AuthRepository } from './auth.repository';
import type { AuthenticatedUser, JwtPayload } from './types/jwt-payload.type';

/**
 * Janela em que um refresh token recém-rotacionado ainda é tratado como "renovação
 * simultânea" (duas abas, ou o app e o Safari, renovando ao mesmo tempo) e não como reuso.
 */
export const CONCURRENT_REFRESH_GRACE_MS = 10_000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login da conta única: só senha, sem e-mail nem usuário (docs/regras-negocio.md → "Acesso").
 * Access token JWT curto (em memória no app) + refresh token opaco e rotativo em cookie
 * httpOnly; o banco guarda só o hash SHA-256 do refresh token.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(password: string): Promise<SessionTokens> {
    const account = await this.repository.findAccount();
    // Mesma mensagem com ou sem conta: não revela se o app já foi configurado.
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      throw new UnauthorizedException('Senha incorreta');
    }
    return this.startSession(account.id);
  }

  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Sessão não encontrada');
    }
    const stored = await this.repository.findRefreshTokenByHash(
      this.hashToken(refreshToken),
    );
    if (!stored) {
      throw new UnauthorizedException('Sessão inválida, entre de novo');
    }

    if (stored.revokedAt) {
      if (
        Date.now() - stored.revokedAt.getTime() <
        CONCURRENT_REFRESH_GRACE_MS
      ) {
        // Rotacionado há instantes por outra requisição: recusa só esta.
        throw new UnauthorizedException(
          'Sessão renovada há pouco, tente de novo',
        );
      }
      // Reuso de um token já trocado: pode ter vazado. Encerra todas as sessões.
      await this.repository.revokeAllRefreshTokens(stored.userId);
      throw new UnauthorizedException('Sessão inválida, entre de novo');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão expirada, entre de novo');
    }

    await this.repository.revokeRefreshToken(stored.id);
    return this.startSession(stored.userId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await this.repository.findRefreshTokenByHash(
      this.hashToken(refreshToken),
    );
    if (stored && !stored.revokedAt) {
      await this.repository.revokeRefreshToken(stored.id);
    }
  }

  /** Confere no banco que a conta do token ainda existe (o token só identifica). */
  async userFromAccessPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Sessão encerrada, entre de novo');
    }
    return { id: user.id };
  }

  getRefreshTokenMaxAgeMs(): number {
    return ms(
      this.configService.getOrThrow<string>(
        'jwt.refreshExpiresIn',
      ) as StringValue,
    );
  }

  private async startSession(userId: string): Promise<SessionTokens> {
    const payload: JwtPayload = { sub: userId };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(32).toString('base64url');
    await this.repository.createRefreshToken(
      userId,
      this.hashToken(refreshToken),
      new Date(Date.now() + this.getRefreshTokenMaxAgeMs()),
    );
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
