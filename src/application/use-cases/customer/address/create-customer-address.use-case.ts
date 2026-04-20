import crypto from 'crypto';
import {
  BAD_REQUEST,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import { Address } from '../../../../domain/entities/address.entity';
import {
  IAddressRepository,
  ICustomerRepository,
} from '../../../../domain/repository';
import { CreateCustomerAddressDto } from '../../../dtos/address/request/create-address.dto';
import { AppError } from '../../../../domain/errors/app-error.error';

export class CreateCustomerAddressUseCase {
  private readonly MAX_ADDRESSES = 5;

  constructor(
    private addressRepository: IAddressRepository,
    private customerRepository: ICustomerRepository,
  ) {}
  async execute(userId: string, data: CreateCustomerAddressDto) {
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) {
      throw new AppError('El usuario no existe', NOT_FOUND);
    }
    const addresses = await this.addressRepository.findByCustomerId(
      customer.id,
    );
    const addressCount = addresses?.length ?? 0;
    if (addressCount >= this.MAX_ADDRESSES) {
      throw new AppError(
        `No puedes tener más de ${this.MAX_ADDRESSES} direcciones registradas`,
        BAD_REQUEST,
      );
    }
    const isFirstAddress = addressCount === 0;
    const shouldBeDefault = isFirstAddress || (data.isDefault ?? false);
    if (shouldBeDefault && !isFirstAddress) {
      await this.addressRepository.clearDefaults(customer.id);
    }
    const saved = new Address(
      this.randomUUID(),
      customer.id,
      data.houseType,
      shouldBeDefault,
      data.address,
      data.department,
      data.province,
      data.district,
      data.apartmentNumber,
      data.reference,
    );
    const saveAddress = await this.addressRepository.save(saved);
    return saveAddress;
  }
  private randomUUID() {
    return crypto.randomUUID();
  }
}
