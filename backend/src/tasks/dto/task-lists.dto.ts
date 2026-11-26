import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Pagar a conta de luz' })
  title: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-11-27',
    description: 'Dia em Brasília; null = sem data',
  })
  date: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '09:00',
    description: 'Horário de Brasília; null = sem horário',
  })
  time: string | null;

  @ApiProperty({ description: 'Concluída (nas listas, só as concluídas hoje)' })
  done: boolean;
}

export class TaskListsDto {
  @ApiProperty({ example: '2026-11-26', description: 'Hoje, em Brasília' })
  day: string;

  @ApiProperty({
    type: [TaskDto],
    description:
      'Sem data ou com data de hoje, não concluídas (por horário, sem horário no fim), e depois as concluídas hoje',
  })
  today: TaskDto[];

  @ApiProperty({
    type: [TaskDto],
    description: 'Data futura, não concluídas, por data e horário',
  })
  upcoming: TaskDto[];

  @ApiProperty({
    type: [TaskDto],
    description: 'Data antes de hoje, não concluídas, por data e horário',
  })
  overdue: TaskDto[];
}
