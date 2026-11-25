import { generateVAPIDKeys } from 'web-push';
import { e2eDatabaseUrl } from './database-url';

/** Segredo do cron nos testes. */
export const E2E_CRON_SECRET = 'segredo-do-cron-nos-testes-e2e-32+chars';

const vapid = generateVAPIDKeys();

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
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  VAPID_SUBJECT: 'https://app-de-habitos.test',
  CRON_SECRET: E2E_CRON_SECRET,
});
