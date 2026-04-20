import { Address } from '../entities/address.entity';

export interface IAddressRepository {
  findById(id: string): Promise<Address | null>;
  findByCustomerId(customerId: string): Promise<Address[] | null>;
  save(address: Address): Promise<Address>;
  update(address: Address): Promise<Address>;
  delete(id: string): Promise<void>;
  clearDefaults(customerId: string): Promise<void>;
}
