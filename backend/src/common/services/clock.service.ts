import { Injectable } from '@nestjs/common';

/**
 * "Agora" injetável: os services de negócio que dependem de "hoje" (horário de Brasília)
 * recebem o relógio por injeção, e os testes usam um relógio fixo.
 */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
