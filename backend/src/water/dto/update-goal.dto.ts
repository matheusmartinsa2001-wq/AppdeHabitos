import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { GOAL_MAX_ML, GOAL_MIN_ML } from '../water.rules';

export class UpdateGoalDto {
  @ApiProperty({ minimum: GOAL_MIN_ML, maximum: GOAL_MAX_ML, example: 3000 })
  @IsInt()
  @Min(GOAL_MIN_ML)
  @Max(GOAL_MAX_ML)
  goalMl: number;
}
