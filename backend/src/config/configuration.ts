import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL,
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10),
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
}));

export const securityConfig = registerAs('security', () => ({
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
  /** Senha da conta única. Só existe em variável de ambiente; o banco guarda o hash. */
  adminPassword: process.env.ADMIN_PASSWORD,
}));
