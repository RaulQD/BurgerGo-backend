import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateCustomerDTO {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @Length(2, 100, {
    message: 'El nombre debe tener entre 2 y 100 caracteres',
  })
  name: string;

  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser un texto' })
  @Length(2, 100, {
    message: 'El apellido debe tener entre 2 y 100 caracteres',
  })
  last_name: string;

  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^[0-9]{9}$/, {
    message: 'El teléfono debe tener exactamente 9 dígitos.',
  })
  phone: string;

  @IsNotEmpty({ message: 'El DNI es requerido' })
  @IsString({ message: 'El DNI debe ser un texto' })
  @Matches(/^[0-9]{8}$/, {
    message: 'El DNI debe tener exactamente 8 dígitos.',
  })
  dni: string;
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @Length(8, 12, {
    message: 'La contraseña debe tener entre 8 y 12 caracteres',
  })
  password: string;
  @IsOptional()
  @IsUUID('4', { message: 'rolId debe ser un UUID válido' })
  rol_id: string;
}
