import { Client } from 'pg';
import { adminDatabaseUrl } from './database-url';

/** Apaga o banco de teste no fim da rodada. */
export default async function globalTeardown(): Promise<void> {
  const { url, database } = adminDatabaseUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  } finally {
    await client.end();
  }
}
