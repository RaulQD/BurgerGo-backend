import { Repository } from 'typeorm';
import { Address } from '../../domain/entities/address.entity';
import { IAddressRepository } from '../../domain/repository/address.repository.interface';
import { AddressEntity, CustomerEntity } from '../database/typeorm/entities';
import { HouseType } from '../../domain/enum/house-type.enum';

export class AddressRepository implements IAddressRepository {
  constructor(private repository: Repository<AddressEntity>) {}

  async clearDefaults(customerId: string): Promise<void> {
    await this.repository.update(
      {
        customer: { id: customerId },
      },
      { isDefault: false },
    );
  }

  async findById(id: string): Promise<Address | null> {
    const address = await this.repository.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!address) return null;
    return this.toDomain(address);
  }

  async findByCustomerId(customerId: string): Promise<Address[] | null> {
    const addresses = await this.repository.find({
      where: { customer: { id: customerId } },
      order: { createdAt: 'ASC' },
    });
    if (!addresses || addresses.length === 0) {
      return null;
    }
    const domainAddresses = addresses.map((address) => this.toDomain(address));
    return domainAddresses;
  }

  async save(data: Address): Promise<Address> {
    const entity = this.toTypeOrmEntity(data);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(data: Address): Promise<Address> {
    const existing = await this.repository.findOne({
      where: { id: data.id },
    });

    if (!existing) {
      throw new Error(`[AddressRepository] Address ${data.id} no encontrado`);
    }
    existing.houseType = data.houseType;
    existing.isDefault = data.isDefault;
    existing.address = data.address;
    existing.department = data.department;
    existing.province = data.province;
    existing.district = data.district;
    if (data.apartmentNumber) existing.apartmentNumber = data.apartmentNumber;
    if (data.reference) existing.reference = data.reference;
    await this.repository.save(existing);
    return this.toDomain(existing);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(addressEntity: AddressEntity): Address {
    return new Address(
      addressEntity.id,
      addressEntity.customer?.id,
      addressEntity.houseType,
      addressEntity.isDefault,
      addressEntity.address,
      addressEntity.department,
      addressEntity.province,
      addressEntity.district,
      addressEntity.apartmentNumber,
      addressEntity.reference,
      addressEntity.latitude,
      addressEntity.longitude,
    );
  }
  private toTypeOrmEntity(domain: Address): AddressEntity {
    const entity = new AddressEntity();
    entity.id = domain.id;
    if (domain.customerId) {
      entity.customer = { id: domain.customerId } as CustomerEntity;
    }
    entity.houseType = domain.houseType as any;
    entity.isDefault = domain.isDefault;
    entity.address = domain.address;
    entity.department = domain.department;
    entity.province = domain.province;
    entity.district = domain.district;
    if (domain.apartmentNumber) entity.apartmentNumber = domain.apartmentNumber;
    if (domain.reference) entity.reference = domain.reference;
    if (domain.latitude) entity.latitude = domain.latitude;
    if (domain.longitude) entity.longitude = domain.longitude;
    return entity;
  }
}
