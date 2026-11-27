import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskListsDto } from './dto/task-lists.dto';
import { TasksHistoryDto, TasksHistoryQueryDto } from './dto/tasks-history.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksHistoryService } from './tasks-history.service';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly historyService: TasksHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listas Hoje, Próximas e Atrasadas' })
  getLists(): Promise<TaskListsDto> {
    return this.tasksService.getLists();
  }

  @Get('history')
  @ApiOperation({
    summary:
      'Histórico do mês: dias verde/vermelho/cinza, concluídas por dia, sequência e percentual',
  })
  getHistory(@Query() query: TasksHistoryQueryDto): Promise<TasksHistoryDto> {
    return this.historyService.getMonth(query.month);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma tarefa' })
  create(@Body() dto: CreateTaskDto): Promise<TaskListsDto> {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita título, data ou horário' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskListsDto> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Exclui a tarefa (a conclusão continua no histórico)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<TaskListsDto> {
    return this.tasksService.remove(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conclui a tarefa hoje' })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<TaskListsDto> {
    return this.tasksService.complete(id);
  }

  @Delete(':id/complete')
  @ApiOperation({ summary: 'Desfaz a conclusão (só no mesmo dia)' })
  undoComplete(@Param('id', ParseUUIDPipe) id: string): Promise<TaskListsDto> {
    return this.tasksService.undoComplete(id);
  }
}
