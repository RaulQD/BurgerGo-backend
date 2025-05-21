// import { AppDataBaseSources } from "../config/data.sources";
// import { UserRepository } from "../repositories/UserRepository";

import { Repository } from "typeorm";
// import { CreateUserDTO } from "../dtos/customer-user/createUser.dto";
import { UserEntity } from "../entities/UserEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { ConflictException } from "../errors/custom.error";
import { RolEntity } from "../entities/RolEntity";


export class UserService {

  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
  }

  // Método para obtener todos los usuarios
  async getAllUser():Promise<UserEntity[]> {
    // Implementar lógica para obtener todos los usuarios
    // Por ahora retornamos datos de prueba
   
    return [];
  }

  // Método para obtener un usuario por ID
  async getUserById(id: number) {
    // Implementar lógica para obtener un usuario por ID
    // Por ahora retornamos datos de prueba
    const user = {
      id,
      name: 'Usuario de prueba',
      email: 'usuario@gmail.com',
    }
    return user;
  }

  // Método para crear un usuario
  // public async createUser(userData: CreateUserDTO): Promise<UserEntity> {
  //   // Implementar lógica para crear un usuario
  //   const existingUser = await this.userRepository.findOneBy({ email: userData.email });
  //   if (existingUser) throw new ConflictException(`El usuario ${userData.email} ya existe`);
  //   // const existingRol = await this.rolRepository.findOneBy({where: });
  //   const newUser = this.userRepository.create({ ...userData });
  //   // Guardar el nuevo usuario en la base de datos
  //   return await this.userRepository.save(newUser);
  // }

  // Método para actualizar un usuario
  public async updateUser(id: string, name: string, email: string) {
    // Implementar lógica para actualizar un usuario
    // Por ahora retornamos datos de prueba
    return { id, name, email };
  }

  // Método para eliminar un usuario
  public async deleteUser(id: number) {
    // Implementar lógica para eliminar un usuario
    // Por ahora retornamos true para simular éxito
    const user = {
      id,
      name: 'Usuario de prueba',
      email: 'usuario@usuario.com'
    }
    return user;
  }
}