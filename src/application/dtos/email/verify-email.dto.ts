import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyTokenDto {
  @IsNotEmpty({ message: 'El token de verificación es requerido' })
  @IsString({ message: 'El token debe ser un texto válido' })
  token: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;
}
