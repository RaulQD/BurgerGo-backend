import { IsEmail, IsNotEmpty, IsString, Length, Matches, ValidateIf } from "class-validator";

export class LoginRequestDTO {

  @ValidateIf(o => !o.username)
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @ValidateIf(o => !o.email)
  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsString({ message: 'El usuario debe ser un texto' })
  @Length(4, 20, { message: 'El nombre de usuario debe tener entre 4 y 20 caracteres.' })
  username: string;
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @Length(8, 12, { message: 'La contraseña debe tener entre 8 y 12 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número',
  })
  password: string;
}