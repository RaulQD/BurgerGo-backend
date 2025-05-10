// import { AppDataBaseSources } from "../config/data.sources";
// import { UserRepository } from "../repositories/UserRepository";

export class UserService {

  // private userRepository: UserRepository;

  constructor() {
    // this.userRepository = new UserRepository();
  }

  // Método para obtener todos los usuarios
  async getAllUser() {
    // Implementar lógica para obtener todos los usuarios
    // Por ahora retornamos datos de prueba
    const users = [
      {
        id: 1,
        name: 'Usuario de prueba',
        email: 'usuario@usuario.com',
        password: '123456',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'Usuario de prueba 2',
        email: 'usuario@usuario.com',
        password: '123456',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    return users;
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
  public async createUser(name: string, email: string) {
    // Implementar lógica para crear un usuario
    // Por ahora retornamos datos de prueba
    return { id: '123', name, email };
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