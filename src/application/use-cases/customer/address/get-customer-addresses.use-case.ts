import { NOT_FOUND } from '../../../../domain/errors/http-status-code';
import {
  ICustomerRepository,
  IAddressRepository,
} from '../../../../domain/repository';
import { AppError } from '../../../../domain/errors/app-error.error';

export class GetAddressCustomerUseCase {
  constructor(
    private addressRepository: IAddressRepository,
    private customerRepository: ICustomerRepository,
  ) {}

  async execute(userId: string) {
    if (!userId) {
      throw new AppError('El ID del usuario es obligatorio.', NOT_FOUND);
    }
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) {
      throw new AppError(
        'No se encontró un perfil de cliente para este usuario',
        NOT_FOUND,
      );
    }
    const addresses = await this.addressRepository.findByCustomerId(
      customer.id,
    );
    if (!addresses) {
      return [];
    }
    return addresses;
  }
}
