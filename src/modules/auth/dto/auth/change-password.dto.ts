import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";


export class ChangePasswordDTO {

  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe al menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número.',
  })
  currentPassword: string;
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida.' })
  @MinLength(8, { message: 'La contraseña debe al menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número.',
  })
  newPassword: string;
  @IsNotEmpty({ message: 'La confirmación de la nueva contraseña es requerida.' })
  @MinLength(8, { message: 'La contraseña debe al menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La confirmación de la nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número.',
  })
  confirmedPassword: string;
}