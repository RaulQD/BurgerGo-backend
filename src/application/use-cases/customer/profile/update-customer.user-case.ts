import {
  BAD_REQUEST,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import { Customer } from '../../../../domain/entities';
import { ICustomerRepository } from '../../../../domain/repository';
import { AppError } from '../../../../domain/errors/app-error.error';

export interface updatecustomerDto {
  name?: string;
  last_name?: string;
  phone?: string;
  dni?: string;
  birthdate?: string;
}

export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}
  async execute(userId: string, data: updatecustomerDto): Promise<Customer> {
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) {
      throw new AppError('El perfil de cliente no existe', NOT_FOUND);
    }
    if (data.dni && data.dni !== customer.dni) {
      const existingCustomer = await this.customerRepository.findByDNI(
        data.dni,
      );
      if (existingCustomer && existingCustomer.id !== customer.id) {
        throw new AppError(
          `El DNI ${data.dni} ya está registrado`,
          BAD_REQUEST,
        );
      }
    }
    customer.updateProfile(data);
    const updatedCustomer = await this.customerRepository.update(customer);
    return updatedCustomer;
  }
}
