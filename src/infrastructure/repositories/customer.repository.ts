import { Repository } from 'typeorm';
import { Customer } from '../../domain/entities/customer.entity';
import { ICustomerRepository } from '../../domain/repository/customer.repository.interface';
import { CustomerEntity } from '../database/typeorm/entities/customer.typeorm-entity';
import { UserEntity } from '../database/typeorm/entities/user.typeorm-entity';
import { AppError } from '../../utils';
import { NOT_FOUND } from '../../domain/errors/http-status-code';

export class CustomerRepository implements ICustomerRepository {
  constructor(private readonly repository: Repository<CustomerEntity>) {}
  async findById(id: string): Promise<Customer | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }
  async findByUserId(userId: string): Promise<Customer | null> {
    const entity = await this.repository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }
  async findByDNI(dni: string): Promise<Customer | null> {
    const entity = await this.repository.findOne({
      where: { dni },
      relations: ['user'],
    });
    return entity ? this.toDomain(entity) : null;
  }
  async save(customer: Customer): Promise<Customer> {
    const entity = this.toTypeORM(customer);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }
  async update(customer: Customer): Promise<Customer> {
    const existing = await this.repository.findOne({
      where: { id: customer.id },
      relations: ['user'],
    });
    if (!existing) {
      throw new Error(
        `[CustomerRepository] Customer ${customer.id} no encontrado para update`,
      );
    }
    if (existing.name !== customer.name) existing.name = customer.name;
    if (existing.last_name !== customer.last_name)
      existing.last_name = customer.last_name;
    if (existing.phone !== customer.phone) existing.phone = customer.phone;
    if (existing.dni !== customer.dni) existing.dni = customer.dni;
    if (customer.birthdate !== undefined) {
      existing.birthdate = customer.birthdate ?? null;
    }
    const saved = await this.repository.save(existing);
    return this.toDomain(saved);
  }
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
  private toDomain(entity: CustomerEntity): Customer {
    return new Customer(
      entity.id,
      entity.name,
      entity.last_name,
      entity.dni,
      entity.phone,
      entity.user.id,
      entity.birthdate ?? undefined,
    );
  }
  private toTypeORM(customer: Customer): CustomerEntity {
    const entity = new CustomerEntity();
    entity.id = customer.id;
    entity.name = customer.name;
    entity.last_name = customer.last_name;
    entity.dni = customer.dni;
    entity.phone = customer.phone;
    entity.birthdate = customer.birthdate ?? null;
    // entity.user se maneja aparte
    const userEntity = new UserEntity();
    userEntity.id = customer.user_id;
    entity.user = userEntity;
    return entity;
  }
}
