import type { Request, Response } from 'express';
import { UserService } from '../services/user.service';


export class UserController {
  // Add your methods and properties here
  // Example property
  constructor(public readonly userService: UserService) { }  // Example method

  public getAllUser = async (_req: Request, res: Response): Promise<void> => {
    // Logic to get a user
    const users = await this.userService.getAllUser();
    res.status(200).json({ message: 'List of users', users });
  }
  // Example method
  public getUserById = async (_req: Request, res: Response):Promise<void> => {
    // Logic to get a user by ID
    const { id } = _req.params;
    const user = await this.userService.getUserById((Number(id)));
    res.status(200).json({ message: `user ${id}`, user });
  }
  // Método para crear un usuario
  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email } = req.body;
      const user = await this.userService.createUser(name, email);
      console.log(`User created: ${name}, Email: ${email} - ${UserController.name}.createUser`);
      res.status(201).json({ message: `Usuario creado: ${name} con email ${email}`, user });
    } catch (error) {
      res.status(500).json({ message: 'Error al crear usuario' });
    }
  }
  // Example method
  public updateUser = async (req: Request, res: Response): Promise<void> => {
    // Logic to update a user
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await this.userService.updateUser(id, name, email);
    console.log(`User updated: ${name}, Email: ${UserController.name} - updateUser`);
    res.status(200).json({ message: `user updated ${name} with email ${email} `, user });
  }
  // Example method
  public deleteUser = async (_req: Request, res: Response): Promise<void> => {
    // Logic to delete a user
    const { id } = _req.params;
    const user = await this.userService.deleteUser(Number(id));
    console.log(`User deleted: ${id} - ${UserController.name} - deleteUser`);
    res.status(200).json({ message: `user deleted ${id}`, user });
  }

}