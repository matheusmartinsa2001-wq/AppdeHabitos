import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { WaterTodayDto } from './dto/water-today.dto';
import { WaterTodayService } from './water-today.service';

@ApiTags('Água')
@ApiBearerAuth()
@Controller('water')
export class WaterTodayController {
  constructor(private readonly todayService: WaterTodayService) {}

  @Get('today')
  @ApiOperation({
    summary: 'Hoje: total bebido, quanto falta, lembretes e registros',
  })
  getToday(): Promise<WaterTodayDto> {
    return this.todayService.getToday();
  }

  @Post('reminders/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '"Tomei": confirma o lembrete hoje' })
  confirmReminder(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WaterTodayDto> {
    return this.todayService.confirmReminder(id);
  }

  @Post('intakes')
  @ApiOperation({ summary: 'Registro livre de água, hoje' })
  addIntake(@Body() dto: CreateIntakeDto): Promise<WaterTodayDto> {
    return this.todayService.addIntake(dto.amountMl);
  }

  @Delete('intakes/:id')
  @ApiOperation({ summary: 'Desfaz um registro de hoje' })
  deleteIntake(@Param('id', ParseUUIDPipe) id: string): Promise<WaterTodayDto> {
    return this.todayService.deleteIntake(id);
  }
}
