import { ApiProperty } from '@nestjs/swagger';

/** Resposta de login/refresh. O refresh token vai só no cookie httpOnly, nunca no corpo. */
export class SessionResponseDto {
  @ApiProperty()
  accessToken: string;
}
