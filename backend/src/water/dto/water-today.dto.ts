import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaterIntakeSource } from '@prisma/client';

export class WaterTodayReminderDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '08:00' })
  time: string;

  @ApiProperty({ example: 500 })
  amountMl: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Registro de hoje que confirmou este lembrete; null = ainda não tomado',
  })
  intakeId: string | null;
}

export class WaterIntakeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    example: '08:12',
    description: 'Hora do registro, em Brasília',
  })
  time: string;

  @ApiProperty({ example: 300 })
  amountMl: number;

  @ApiProperty({ enum: WaterIntakeSource })
  source: WaterIntakeSource;

  @ApiPropertyOptional({
    nullable: true,
    example: '08:00',
    description: 'Horário do lembrete confirmado (só quando source = REMINDER)',
  })
  reminderTime: string | null;
}

export class WaterTodayDto {
  @ApiProperty({ example: '2026-11-25', description: 'Hoje, em Brasília' })
  day: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Meta de hoje; null sem meta',
  })
  goalMl: number | null;

  @ApiProperty()
  totalMl: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Quanto falta para a meta (0 = batida); null sem meta',
  })
  remainingMl: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'null sem meta' })
  goalReached: boolean | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Quanto falta para os lembretes chegarem à meta; null sem meta',
  })
  remindersShortfallMl: number | null;

  @ApiProperty({
    type: [WaterTodayReminderDto],
    description: 'Em ordem de horário',
  })
  reminders: WaterTodayReminderDto[];

  @ApiProperty({ type: [WaterIntakeDto], description: 'Mais recente primeiro' })
  intakes: WaterIntakeDto[];
}
