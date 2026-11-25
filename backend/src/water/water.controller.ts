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
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { WaterReminderDto, WaterSettingsDto } from './dto/water-settings.dto';
import { WaterService } from './water.service';

@ApiTags('Água')
@ApiBearerAuth()
@Controller('water')
export class WaterController {
  constructor(private readonly waterService: WaterService) {}

  @Get('settings')
  @ApiOperation({
    summary:
      'Meta de hoje, lembretes e quanto falta para os lembretes somarem a meta',
  })
  getSettings(): Promise<WaterSettingsDto> {
    return this.waterService.getSettings();
  }

  @Put('goal')
  @ApiOperation({ summary: 'Define a meta diária (vale a partir de hoje)' })
  setGoal(@Body() dto: UpdateGoalDto): Promise<WaterSettingsDto> {
    return this.waterService.setGoal(dto.goalMl);
  }

  @Post('reminders')
  @ApiOperation({ summary: 'Cria um lembrete (horário + mL)' })
  createReminder(@Body() dto: CreateReminderDto): Promise<WaterReminderDto> {
    return this.waterService.createReminder(dto);
  }

  @Patch('reminders/:id')
  @ApiOperation({ summary: 'Altera o horário e/ou os mL de um lembrete' })
  updateReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ): Promise<WaterReminderDto> {
    return this.waterService.updateReminder(id, dto);
  }

  @Delete('reminders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um lembrete' })
  deleteReminder(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.waterService.deleteReminder(id);
  }
}
