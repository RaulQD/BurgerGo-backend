import { IsEmail, IsNotEmpty, IsString, Length, Matches } from "class-validator";


export class UpdateCustomerUserDTO {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, { message: 'El nombre solo puede contener letras' })
  name: string;

  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser un texto' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  last_name: string;

  // @IsNotEmpty({ message: 'La dirección es requerida' })
  // @IsString({ message: 'La dirección debe ser un texto' })
  // @Length(5, 255, { message: 'La dirección debe tener entre 5 y 255 caracteres' })
  // address: string;

  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^[0-9]{9}$/, { message: 'El teléfono debe contener solo números y tener 9 dígitos ' })
  phone: string;

  @IsNotEmpty({ message: 'El DNI es requerido' })
  @IsString({ message: 'El DNI debe ser un texto' })
  @Matches(/^[0-9]{8}$/, { message: 'El DNI debe contener solo números y tener 8 dígitos' })
  dni: string;

}