import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class TasksHistoryQueryDto {
  @ApiPropertyOptional({
    example: '2026-11',
    description: 'Mês (YYYY-MM); padrão: mês atual em Brasília',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Mês precisa estar no formato AAAA-MM (ex.: 2026-11)',
  })
  month?: string;
}

/**
 * - `met`: tudo o que era do dia foi feito — verde;
 * - `missed`: faltou alguma — vermelho;
 * - `empty`: não havia tarefa para o dia — cinza (não conta na sequência nem no %);
 * - `today`: hoje, ainda em andamento — neutro até a meia-noite;
 * - `none`: antes da primeira tarefa ou no futuro — sem avaliação.
 */
export type TaskDayStatus = 'met' | 'missed' | 'empty' | 'today' | 'none';

export class TaskHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: 'Feita no dia (avulsa: concluída até esse dia)' })
  done: boolean;
}

export class TasksHistoryDayDto {
  @ApiProperty({ example: '2026-11-24' })
  day: string;

  @ApiProperty({ enum: ['met', 'missed', 'empty', 'today', 'none'] })
  status: TaskDayStatus;

  @ApiProperty({
    description: 'Tarefas concluídas nesse dia (todas, inclusive as sem data)',
  })
  completed: number;

  @ApiProperty({
    type: [TaskHistoryItemDto],
    description:
      'O que era do dia: recorrentes que caíam nele e avulsas com essa data',
  })
  planned: TaskHistoryItemDto[];
}

export class TasksHistoryDto {
  @ApiProperty({ example: '2026-11' })
  month: string;

  @ApiProperty({
    type: [TasksHistoryDayDto],
    description: 'Todos os dias do mês',
  })
  days: TasksHistoryDayDto[];

  @ApiProperty({ description: 'Dias do mês já fechados com tudo feito' })
  metDays: number;

  @ApiProperty({
    description: 'Dias do mês já fechados que tinham tarefa (sem hoje)',
  })
  evaluatedDays: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'metDays / evaluatedDays em %; null sem dias avaliados',
  })
  percent: number | null;

  @ApiProperty({
    description:
      'Dias seguidos com tudo feito até ontem (dias sem tarefa não quebram), mais hoje se já fez tudo',
  })
  currentStreak: number;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-11-26',
    description: 'Dia da primeira tarefa criada (início do calendário)',
  })
  firstDay: string | null;

  @ApiProperty()
  canGoBack: boolean;

  @ApiProperty()
  canGoForward: boolean;
}
