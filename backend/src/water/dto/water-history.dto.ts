import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class WaterHistoryQueryDto {
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
 * - `met`: meta batida (total ≥ meta do dia) — verde;
 * - `missed`: não batida — vermelho;
 * - `today`: hoje, ainda em andamento — neutro até a meia-noite;
 * - `none`: antes da primeira meta ou no futuro — sem avaliação.
 */
export type WaterDayStatus = 'met' | 'missed' | 'today' | 'none';

export class WaterHistoryDayDto {
  @ApiProperty({ example: '2026-11-24' })
  day: string;

  @ApiProperty({ enum: ['met', 'missed', 'today', 'none'] })
  status: WaterDayStatus;

  @ApiPropertyOptional({ nullable: true, description: 'Meta que valia no dia' })
  goalMl: number | null;

  @ApiProperty()
  totalMl: number;
}

export class WaterHistoryDto {
  @ApiProperty({ example: '2026-11' })
  month: string;

  @ApiProperty({
    type: [WaterHistoryDayDto],
    description: 'Todos os dias do mês',
  })
  days: WaterHistoryDayDto[];

  @ApiProperty({
    description: 'Dias do mês com a meta batida (dias já fechados)',
  })
  metDays: number;

  @ApiProperty({
    description:
      'Dias do mês já fechados e avaliados (desde a primeira meta, sem hoje)',
  })
  evaluatedDays: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'metDays / evaluatedDays em %; null sem dias avaliados',
  })
  percent: number | null;

  @ApiProperty({
    description:
      'Dias seguidos batendo a meta até ontem, mais hoje se já bateu',
  })
  currentStreak: number;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-11-20',
    description: 'Dia da primeira meta (início do calendário)',
  })
  firstDay: string | null;

  @ApiProperty()
  canGoBack: boolean;

  @ApiProperty()
  canGoForward: boolean;
}
