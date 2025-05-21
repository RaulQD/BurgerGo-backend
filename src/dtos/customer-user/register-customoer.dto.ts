import { ValidateNested } from "class-validator";
import { CreateCustomerDTO } from "./create-customer-user.dto";
import { Type } from "class-transformer";
import { CreateUserDto } from "../user/create-user.dto";

export class RegisterCustomerDTO {
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;

  @ValidateNested()
  @Type(() => CreateCustomerDTO)
  customer: CreateCustomerDTO;
}