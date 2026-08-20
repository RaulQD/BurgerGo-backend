import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { UserEntity } from '../database/typeorm/entities/user.typeorm-entity';
import { RolEntity } from '../database/typeorm/entities/rol.typeorm-entity';
import { IUserRepository } from '../../domain/repository';

export class UserRepository implements IUserRepository {
  constructor(private readonly repository: Repository<UserEntity>) {}
  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['rol'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email },
      relations: ['rol'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(user: User): Promise<User> {
    const entity = this.toTypeOrm(user);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }
  async update(user: User): Promise<User> {
    const entity = this.toTypeOrm(user);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { email_verified: true });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.password,
      entity.rol.name,
      entity.rol.id,
      entity.email_verified,
      entity.createdAt,
      entity.updatedAt,
    );
  }
  private toTypeOrm(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email;
    entity.password = user.password;
    entity.email_verified = user.email_verified;
    const rolEntity = new RolEntity();
    rolEntity.id = user.rol_id;
    entity.rol = rolEntity;
    return entity;
  }
}
