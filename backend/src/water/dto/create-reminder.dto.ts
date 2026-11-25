import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { REMINDER_MAX_ML, REMINDER_MIN_ML, TIME_PATTERN } from '../water.rules';

export class CreateReminderDto {
  @ApiProperty({ example: '08:30', description: 'Horário de Brasília, HH:MM' })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'Horário precisa estar no formato HH:MM (ex.: 08:30)',
  })
  time: string;

  @ApiProperty({
    minimum: REMINDER_MIN_ML,
    maximum: REMINDER_MAX_ML,
    example: 500,
  })
  @IsInt()
  @Min(REMINDER_MIN_ML)
  @Max(REMINDER_MAX_ML)
  amountMl: number;
}
