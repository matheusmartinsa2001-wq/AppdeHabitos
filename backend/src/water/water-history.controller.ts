import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaterHistoryDto, WaterHistoryQueryDto } from './dto/water-history.dto';
import { WaterHistoryService } from './water-history.service';

@ApiTags('Água')
@ApiBearerAuth()
@Controller('water')
export class WaterHistoryController {
  constructor(private readonly historyService: WaterHistoryService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Calendário do mês (verde/vermelho), sequência atual e percentual',
  })
  getMonth(@Query() query: WaterHistoryQueryDto): Promise<WaterHistoryDto> {
    return this.historyService.getMonth(query.month);
  }
}
