import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class LoginEmployeeDTO {
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  @IsString({ message: 'El nombre de usuario debe ser un texto' })
  @Length(4, 20, { message: 'El nombre de usuario debe tener entre 4 y 20 caracteres' })
  username: string;
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @Length(8, 12, { message: 'La contraseña debe tener entre 8 y 12 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos 8 caracteres, una letra minúscula, una mayúscula y un número',
  })
  password: string;
}