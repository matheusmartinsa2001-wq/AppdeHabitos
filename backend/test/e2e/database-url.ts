/**
 * Banco só dos testes ponta a ponta, no mesmo Postgres do desenvolvimento (porta 5433
 * publicada pelo docker-compose). Pode ser trocado com `E2E_DATABASE_URL`.
 *
 * Trava de segurança: o nome do banco precisa terminar em `_e2e` — o setup apaga e
 * recria esse banco a cada rodada, então nunca pode apontar para o de dev ou produção.
 */
const DEFAULT_URL =
  'postgresql://habitos:habitos_dev_password@localhost:5433/app_de_habitos_e2e?schema=public';

export function e2eDatabaseUrl(): URL {
  const url = new URL(process.env.E2E_DATABASE_URL ?? DEFAULT_URL);
  const database = url.pathname.replace(/^\//, '');
  if (!database.endsWith('_e2e')) {
    throw new Error(
      `E2E_DATABASE_URL precisa apontar para um banco terminado em "_e2e" (recebido: "${database}")`,
    );
  }
  return url;
}

/** Mesma conexão, mas no banco `postgres` — para criar/apagar o banco de teste. */
export function adminDatabaseUrl(): { url: string; database: string } {
  const url = e2eDatabaseUrl();
  const database = url.pathname.replace(/^\//, '');
  url.pathname = '/postgres';
  url.search = '';
  return { url: url.toString(), database };
}
