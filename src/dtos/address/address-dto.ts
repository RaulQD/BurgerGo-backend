import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { HouseType } from "../../entities/AddressEntity";


export class AddressDTO {

  @IsEnum(HouseType, { message: 'El tipo de dirección no es válido (home, work, other)' })
  houseType: HouseType;
  @IsString({ message: 'La dirección debe ser un texto' })
  @MaxLength(200, { message: 'La dirección no debe superar los 200 caracteres' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;

}