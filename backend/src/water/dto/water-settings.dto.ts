import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WaterReminderDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '08:30' })
  time: string;

  @ApiProperty({ example: 500 })
  amountMl: number;
}

export class WaterSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Meta que vale hoje; null antes da primeira meta',
  })
  goalMl: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-11-25',
    description: 'Dia (Brasília) a partir do qual a meta atual vale',
  })
  goalEffectiveFrom: string | null;

  @ApiProperty({ type: [WaterReminderDto], description: 'Em ordem de horário' })
  reminders: WaterReminderDto[];

  @ApiProperty({ description: 'Soma dos mL dos lembretes' })
  remindersTotalMl: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Quanto falta para os lembretes chegarem à meta (0 = chegam); null sem meta',
  })
  remindersShortfallMl: number | null;
}
