import { IsNotEmpty, IsString } from "class-validator";

export class CreateRolDto {
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @IsString({ message: "El nombre no es válido" })
  name!: string;
}