import { e2eDatabaseUrl } from './database-url';

/** Senha da conta única nos testes (nunca a senha real do app). */
export const E2E_PASSWORD = 'senha-de-teste-e2e';

// Roda antes de cada arquivo de teste. Variáveis do processo têm prioridade sobre o
// backend/.env no ConfigModule do Nest, então o app de teste nunca usa o banco de dev.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: e2eDatabaseUrl().toString(),
  FRONTEND_URL: 'http://localhost:5174',
  TRUST_PROXY_HOPS: '0',
  JWT_ACCESS_SECRET: 'segredo-de-acesso-dos-testes-e2e-com-32+',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '30d',
  BCRYPT_SALT_ROUNDS: '4',
  ADMIN_PASSWORD: E2E_PASSWORD,
});
