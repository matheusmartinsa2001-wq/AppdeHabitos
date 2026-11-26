import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({
    nullable: true,
    type: [Number],
    example: [1, 3, 5],
    description:
      'Recorrente: dias da semana, 0 (domingo) a 6 (sábado). null/ausente = avulsa. Com repetição, sem data',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um dia da semana' })
  @ArrayMaxSize(7)
  @ArrayUnique({ message: 'Dias da semana repetidos' })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  repeat?: number[] | null;
}
