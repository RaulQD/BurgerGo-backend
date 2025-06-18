// import { AppDataBaseSources } from "../config/data.sources";
// import { UserRepository } from "../repositories/UserRepository";

import { Repository } from "typeorm";
// import { CreateUserDTO } from "../dtos/customer-user/createUser.dto";
import { UserEntity, UserType } from "../entities/UserEntity";
import { AppDataBaseSources } from "../config/data.sources";
import { ConflictException, NotFoundException } from "../errors/custom.error";
import { RolEntity } from "../entities/RolEntity";
import { CustomerEntity } from "../entities/CustomerEntity";
import { EmployeeEntity } from "../entities/EmployeeEntity";


export class UserService {

  private userRepository: Repository<UserEntity>;
  private rolRepository: Repository<RolEntity>;
  private customerRepository: Repository<CustomerEntity>;
  private employeeRepository: Repository<EmployeeEntity>;
  constructor() {
    this.userRepository = AppDataBaseSources.getRepository(UserEntity);
    this.rolRepository = AppDataBaseSources.getRepository(RolEntity);
    this.customerRepository = AppDataBaseSources.getRepository(CustomerEntity);
    this.employeeRepository = AppDataBaseSources.getRepository(EmployeeEntity);
  }

  // Método para obtener todos los usuarios
  async getAllUser(): Promise<UserEntity[]> {
    // Implementar lógica para obtener todos los usuarios
    // Por ahora retornamos datos de prueba

    return [];
  }
  private async findUserWithRelations(id: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user').where('user.id = :id', { id });
    // Agregar relaciones según el tipo de usuario
    queryBuilder.leftJoinAndSelect('user.customer', 'customer', 'user.type = :customerType', { customerType: UserType.CUSTOMER })

    const user = await queryBuilder.getOne();
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
  // Método para obtener un usuario por ID
  async getUserById(id: string) {

    return await this.findUserWithRelations(id);
  }

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