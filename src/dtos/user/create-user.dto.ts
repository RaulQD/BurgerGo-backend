import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from "class-validator";
import { UserType } from "../../entities/UserEntity";

export class CreateUserDto {
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;
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
  @IsEnum(UserType, { message: 'El tipo de usuario debe ser válido' })
  @IsOptional()
  type: UserType = UserType.CUSTOMER;


} 