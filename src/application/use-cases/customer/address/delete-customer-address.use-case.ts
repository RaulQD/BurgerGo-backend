import {
  BAD_REQUEST,
  FORBIDDEN,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import {
  IAddressRepository,
  ICustomerRepository,
} from '../../../../domain/repository';
import { AppError } from '../../../../domain/errors/app-error.error';

export class DeleteCustomerAddressUseCase {
  constructor(
    private addressRepository: IAddressRepository,
    private customerRepository: ICustomerRepository,
  ) {}

  async execute(addressId: string, userId: string) {
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) {
      throw new AppError('El usuario no existe', NOT_FOUND);
    }
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new AppError('La dirección no existe', NOT_FOUND);
    }
    if (address.customerId !== customer.id) {
      throw new AppError(
        'la dirección no pertenece al usuario registrado',
        FORBIDDEN,
      );
    }
    if (address.isDefault) {
      throw new AppError(
        'No puedes eliminar la dirección predeterminada',
        BAD_REQUEST,
      );
    }
    const result = await this.addressRepository.delete(address.id);
    return result;
  }
}
