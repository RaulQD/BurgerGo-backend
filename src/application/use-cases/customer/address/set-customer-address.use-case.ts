import {
  FORBIDDEN,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import {
  IAddressRepository,
  ICustomerRepository,
} from '../../../../domain/repository';
import { AppError } from '../../../../domain/errors/app-error.error';

export class SetDefaultAddressUseCase {
  constructor(
    private addressRepository: IAddressRepository,
    private customerRepository: ICustomerRepository,
  ) {}

  async execute(addressId: string, userId: string) {
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) throw new AppError('Usuario no encontrado', NOT_FOUND);

    const address = await this.addressRepository.findById(addressId);
    if (!address)
      throw new AppError('La dirección no fue encontrada', NOT_FOUND);

    if (address.customerId !== customer.id)
      throw new AppError(
        'la dirección no pertenece al usuario registrado',
        FORBIDDEN,
      );
    await this.addressRepository.clearDefaults(customer.id);
    address.isDefault = true;

    return await this.addressRepository.save(address);
  }
}
