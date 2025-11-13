import { Repository } from 'typeorm';
import { IRolRepository } from '../../domain/repository/rol.repository.interface';
import { Rol } from '../../domain/entities/rol.entity';
import { RolEntity } from '../database/typeorm/entities/rol.typeorm-entity';

export class RolRepository implements IRolRepository {
  constructor(private readonly repository: Repository<RolEntity>) {}

  async findById(id: string): Promise<Rol> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Rol con ID ${id} no encontrado`);
    }
    return this.toDomain(entity);
  }

  async findByName(name: string): Promise<Rol> {
    const entity = await this.repository.findOne({ where: { name } });
    if (!entity) {
      throw new Error(`Rol ${name} no encontrado`);
    }
    return this.toDomain(entity);
  }

  private toDomain(entity: RolEntity): Rol {
    return new Rol(entity.id, entity.name);
  }
}
