import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { adminDatabaseUrl, e2eDatabaseUrl } from './database-url';

/** Recria o banco de teste do zero e aplica as migrations (uma vez por rodada). */
export default async function globalSetup(): Promise<void> {
  const { url, database } = adminDatabaseUrl();
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Não foi possível conectar ao Postgres para os testes e2e (${url.replace(/\/\/.*@/, '//***@')}). ` +
        'Suba o banco com "docker compose up -d postgres". Detalhe: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  try {
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${database}"`);
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl().toString() },
  });
}
