import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyTokenDto {
  @IsString()
  @Length(6, 6, { message: 'Token de verificación inválido' })
  token: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;
}
