import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  // Sem @Trim(): espaço faz parte da senha.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(72) // limite do bcrypt
  password: string;
}
