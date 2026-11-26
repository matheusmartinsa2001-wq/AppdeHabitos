import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

/** Campo ausente = não muda; `date`/`time` = null limpa. */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
