import 'reflect-metadata';
import { validateEnvironment } from './env.validation';

const VALID = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@host/db',
  FRONTEND_URL: 'https://app.vercel.app',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  ADMIN_PASSWORD: 'senha-secreta-123',
};

describe('validateEnvironment', () => {
  it('aceita a configuração completa', () => {
    expect(() => validateEnvironment(VALID)).not.toThrow();
  });

  it('diz numa linha qual variável falhou e por quê, sem mostrar o valor', () => {
    const run = () =>
      validateEnvironment({
        ...VALID,
        JWT_ACCESS_SECRET: 'curto-demais',
        ADMIN_PASSWORD: 'abc',
      });
    expect(run).toThrow(
      'Variáveis de ambiente inválidas: JWT_ACCESS_SECRET (minLength); ADMIN_PASSWORD (minLength)',
    );
    try {
      run();
    } catch (error) {
      expect(String(error)).not.toContain('curto-demais');
      expect(String(error)).not.toContain('abc');
    }
  });
});
