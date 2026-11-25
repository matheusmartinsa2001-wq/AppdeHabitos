import { Transform } from 'class-transformer';

/**
 * Converte um query param string (`"true"`/`"false"`) num boolean de verdade.
 *
 * Não dá para usar `@Type(() => Boolean)` nem confiar no `enableImplicitConversion` global do
 * `ValidationPipe`: `Boolean("false") === true`, então qualquer valor de `?flag=` (inclusive
 * `false`) virava `true`. Lê o valor **cru** do objeto de origem (`obj[key]`) — antes de qualquer
 * conversão implícita — e compara com as strings esperadas.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(
    ({
      obj,
      key,
    }: {
      obj: Record<string, unknown>;
      key: string;
    }): boolean | undefined => {
      const raw = obj?.[key];
      if (raw === true || raw === 'true' || raw === '1') return true;
      if (raw === false || raw === 'false' || raw === '0') return false;
      return undefined;
    },
  );
}
