import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum HouseType {
  HOME = 'casa',
  WORK = 'trabajo',
  COUPLE = 'pareja',
  OTHER = 'other',
}

export class CreateCustomerAddressDto {
  @IsEnum(HouseType, {
    message: 'El tipo de casa debe ser casa, trabajo, pareja u other',
  })
  @IsNotEmpty({ message: 'El tipo de casa es obligatorio' })
  houseType: HouseType;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString({ message: 'El departamento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El departamento es obligatorio.' })
  department: string;

  @IsString({ message: 'La provincia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La provincia es obligatoria.' })
  province: string;

  @IsString({ message: 'El distrito debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El distrito es obligatorio' })
  district: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección exacta es obligatoria' })
  @MaxLength(250)
  address: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  apartmentNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  reference?: string;
}
