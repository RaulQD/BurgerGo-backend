import { Rol } from '../entities/rol.entity';

export interface IRolRepository {
  findById(id: string): Promise<Rol>;
  findByName(name: string): Promise<Rol>;
}
