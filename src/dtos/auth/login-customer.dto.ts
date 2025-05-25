import { IsEmail, IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class LoginCustomerDTO {
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @Length(8, 12, { message: 'La contraseña debe tener entre 8 y 12 caracteres' })

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número',
  })
  password: string;
}