import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import {
  PushStatusDto,
  PushSubscriptionDto,
  UnsubscribeDto,
} from './dto/push-subscription.dto';
import { BroadcastResult, PushService } from './push.service';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('status')
  @ApiOperation({ summary: 'Se o servidor envia push e a chave pública VAPID' })
  getStatus(): PushStatusDto {
    return this.pushService.getStatus();
  }

  @Post('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inscreve este aparelho para receber notificações' })
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscriptionDto,
  ): Promise<void> {
    return this.pushService.subscribe(user.id, dto);
  }

  @Delete('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela as notificações deste aparelho' })
  unsubscribe(@Body() dto: UnsubscribeDto): Promise<void> {
    return this.pushService.unsubscribe(dto.endpoint);
  }

  @Post('test')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Envia uma notificação de teste para os aparelhos inscritos',
  })
  sendTest(): Promise<BroadcastResult> {
    return this.pushService.sendTest();
  }
}
