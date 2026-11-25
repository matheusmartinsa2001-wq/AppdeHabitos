import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionResponseDto } from './dto/session-response.dto';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  // Conta única: o limite por IP já protege contra força bruta.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Entra com a senha e inicia a sessão' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const { accessToken, refreshToken } = await this.authService.login(
      dto.password,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Renova a sessão com o refresh token do cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const { accessToken, refreshToken } = await this.authService.refresh(
      this.readRefreshCookie(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE
    ];
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.authService.getRefreshTokenMaxAgeMs(),
    });
  }

  /**
   * O app sempre fala com a API pelo mesmo "site": em produção a Vercel repassa `/api`
   * ao backend (rewrite), e em desenvolvimento localhost:5174 e :3001 já são o mesmo site.
   * Por isso `SameSite=Lax` basta — e é o que o Safari do iPhone aceita, já que ele
   * bloqueia cookies de outro site. `Secure` em produção (HTTPS). Ver docs/decisoes.md (Etapa 6).
   */
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('app.nodeEnv') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    };
  }
}
