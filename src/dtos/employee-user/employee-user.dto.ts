import { IsEmail, IsNotEmpty, IsString, IsUUID, Length, Matches } from "class-validator";

export class CreateEmployeeDTO {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  name: string;

  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser un texto' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  last_name: string;
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;
  @IsNotEmpty({ message: 'La dirección es requerida' })
  @IsString({ message: 'La dirección debe ser un texto' })
  @Length(2, 100, { message: 'La dirección debe tener entre 2 y 100 caracteres' })
  address: string;
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^\d{9}$/, { message: 'El teléfono debe tener entre 9 digitos' })
  phone: string;
  @IsNotEmpty({ message: 'El dni es requerido' })
  @Matches(/^\d{8}$/, { message: 'El dni debe tener 8 dígitos' })
  dni: string;
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  @IsString({ message: 'El nombre de usuario debe ser un texto' })
  @Length(4, 20, { message: 'El nombre de usuario debe tener entre 4 y 20 caracteres' })
  username: string;
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @Length(8, 30, { message: 'La contraseña debe tener entre 8 y 30 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número',
  })
  password: string;

  @IsUUID('4', { message: 'rolId debe ser un UUID válido' })
  rol_id: string;

}