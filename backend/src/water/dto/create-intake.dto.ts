import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { INTAKE_MAX_ML, INTAKE_MIN_ML } from '../water.rules';

/** Registro livre (fora dos lembretes). Sempre no dia de hoje. */
export class CreateIntakeDto {
  @ApiProperty({ minimum: INTAKE_MIN_ML, maximum: INTAKE_MAX_ML, example: 300 })
  @IsInt()
  @Min(INTAKE_MIN_ML)
  @Max(INTAKE_MAX_ML)
  amountMl: number;
}
