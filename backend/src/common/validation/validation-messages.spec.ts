import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  validate,
} from 'class-validator';
import { Trim } from '../decorators/trim.decorator';
import { validationExceptionFactory } from './validation-messages';

class SampleDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  password: string;

  @IsInt()
  @Min(1)
  goalMl: number;
}

async function messagesFor(body: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(SampleDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const exception = validationExceptionFactory(errors);
  expect(exception).toBeInstanceOf(BadRequestException);
  return (exception.getResponse() as { message: string[] }).message;
}

describe('mensagens de validação em português', () => {
  it('texto só com espaços é recusado como obrigatório', async () => {
    const messages = await messagesFor({ password: '   ', goalMl: 2000 });
    expect(messages).toEqual(['Senha é obrigatório']);
  });

  it('mínimo, tamanho e campo não aceito saem em português, com o rótulo do campo', async () => {
    const messages = await messagesFor({
      password: 'x'.repeat(11),
      goalMl: 0,
      extra: 1,
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        'Senha aceita no máximo 10 caracteres',
        'Meta diária precisa ser no mínimo 1',
        'O campo "extra" não é aceito aqui',
      ]),
    );
    expect(messages.join(' ')).not.toMatch(/must|should/);
  });
});
