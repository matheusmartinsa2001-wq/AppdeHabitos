import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PushKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  p256dh: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  auth: string;
}

/** Formato de `PushSubscription.toJSON()` do navegador. */
export class PushSubscriptionDto {
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  endpoint: string;
}

export class PushStatusDto {
  @ApiProperty({ description: 'false = servidor sem chaves VAPID' })
  enabled: boolean;

  @ApiProperty({
    nullable: true,
    description: 'Chave pública VAPID para o navegador',
  })
  publicKey: string | null;
}
