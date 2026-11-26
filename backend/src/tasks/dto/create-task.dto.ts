import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { TIME_PATTERN } from '../../water/water.rules';
import { DATE_PATTERN, TASK_TITLE_MAX } from '../tasks.rules';

export class CreateTaskDto {
  @ApiProperty({ maxLength: TASK_TITLE_MAX, example: 'Pagar a conta de luz' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MaxLength(TASK_TITLE_MAX, {
    message: `Título pode ter no máximo ${TASK_TITLE_MAX} caracteres`,
  })
  title: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-11-27',
    description: 'Dia em Brasília (hoje ou futuro); null = sem data',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN, {
    message: 'Data precisa estar no formato AAAA-MM-DD',
  })
  date?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '09:00',
    description: 'Horário de Brasília, HH:MM; só com data',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Horário precisa estar no formato HH:MM (ex.: 08:30)',
  })
  time?: string | null;
}
