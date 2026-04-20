import {
  FORBIDDEN,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import { Address } from '../../../../domain/entities/address.entity';
import {
  IAddressRepository,
  ICustomerRepository,
} from '../../../../domain/repository';
import { AppError } from '../../../../domain/errors/app-error.error';

export class UpdateCustomerAddressUseCase {
  constructor(
    private readonly addressRepository: IAddressRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(data: Address): Promise<Address> {
    const customer = await this.customerRepository.findByUserId(
      data.customerId,
    );
    if (!customer) {
      throw new AppError('El usuario no existe', NOT_FOUND);
    }
    const address = await this.addressRepository.findById(data.id);
    if (!address) {
      throw new AppError('Dirección no encontrada', NOT_FOUND);
    }
    if (address.customerId !== customer.id) {
      throw new AppError(
        'La dirección no pertenece al usuario registrado',
        FORBIDDEN,
      );
    }

    const updatedAddress = await this.addressRepository.update(data);
    return updatedAddress;
  }
}
