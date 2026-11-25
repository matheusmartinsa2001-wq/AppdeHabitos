import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsIn([NodeEnv.Development, NodeEnv.Production, NodeEnv.Test])
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  // Quantos proxies reversos confiáveis ficam na frente do backend (0 = nenhum).
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY_HOPS: number = 0;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_SALT_ROUNDS: number = 10;

  // Senha da conta única (ver AccountBootstrapService). Opcional: sem ela, a conta já
  // existente no banco continua valendo; sem ela e sem conta, ninguém consegue entrar.
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite do bcrypt
  ADMIN_PASSWORD?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    // Uma linha só, com o nome da variável e as regras que falharam — nunca o valor
    // (que pode ser uma senha). Fica fácil de ler no log do provedor.
    const details = errors
      .map(
        (error) =>
          `${error.property} (${Object.keys(error.constraints ?? {}).join(', ')})`,
      )
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }

  return validatedConfig;
}
