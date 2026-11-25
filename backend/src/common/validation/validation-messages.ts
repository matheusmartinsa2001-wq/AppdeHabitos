import { BadRequestException, type ValidationError } from '@nestjs/common';

/** Nome do campo como aparece na tela. Campo fora da lista aparece com o nome técnico. */
const FIELD_LABELS: Record<string, string> = {
  password: 'Senha',
  goalMl: 'Meta diária',
  amountMl: 'Quantidade',
  time: 'Horário',
  page: 'Página',
  limit: 'Limite',
};

const number = (message: string) => message.match(/-?\d+(\.\d+)?/)?.[0] ?? '';

/** Mensagem em português para cada regra do class-validator. */
function translate(
  constraint: string,
  defaultMessage: string,
  label: string,
): string {
  switch (constraint) {
    case 'isNotEmpty':
      return `${label} é obrigatório`;
    case 'maxLength':
      return `${label} aceita no máximo ${number(defaultMessage)} caracteres`;
    case 'minLength':
      return `${label} precisa ter ao menos ${number(defaultMessage)} caracteres`;
    case 'isEmail':
      return `${label} inválido`;
    case 'isInt':
      return `${label} precisa ser um número inteiro`;
    case 'isNumber':
      return `${label} precisa ser um número`;
    case 'min':
      return `${label} precisa ser no mínimo ${number(defaultMessage)}`;
    case 'max':
      return `${label} precisa ser no máximo ${number(defaultMessage)}`;
    case 'isDateString':
    case 'isIso8601':
    case 'isDate':
      return `${label} precisa ser uma data válida`;
    case 'isUuid':
      return `${label} inválido`;
    case 'isEnum':
    case 'isIn':
      return `${label} tem um valor inválido`;
    case 'isString':
      return `${label} precisa ser um texto`;
    case 'isBoolean':
      return `${label} precisa ser verdadeiro ou falso`;
    case 'isArray':
      return `${label} precisa ser uma lista`;
    case 'arrayMinSize':
      return `${label} precisa ter ao menos ${number(defaultMessage)} item(ns)`;
    case 'arrayMaxSize':
      return `${label} aceita no máximo ${number(defaultMessage)} item(ns)`;
    case 'whitelistValidation':
      return `O campo "${label}" não é aceito aqui`;
    default:
      return `${label} inválido`;
  }
}

function collect(errors: ValidationError[], prefix = ''): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const label = FIELD_LABELS[error.property] ?? path;
    for (const [constraint, message] of Object.entries(
      error.constraints ?? {},
    )) {
      // Mensagem padrão do class-validator começa pelo nome da propriedade (em inglês);
      // a que foi escrita no decorator (`{ message }`) fica como está.
      const isDefault =
        message.startsWith(`${error.property} `) ||
        message.startsWith(`property ${error.property} `) ||
        message.startsWith(`each value in ${error.property}`);
      messages.push(
        isDefault ? translate(constraint, message, label) : message,
      );
    }
    if (error.children?.length) messages.push(...collect(error.children, path));
  }
  return messages;
}

/** `exceptionFactory` do `ValidationPipe` global: mesmo formato de erro, texto em português. */
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(collect(errors));
}
