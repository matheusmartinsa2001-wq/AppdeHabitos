import { Transform } from 'class-transformer';

/**
 * Tira espaços das pontas antes de validar: um nome só com espaços vira ""
 * e cai no `@IsNotEmpty()`, em vez de ser gravado em branco. Não usar em senha.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
