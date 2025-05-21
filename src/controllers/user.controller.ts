import { Request, Response } from 'express';
import { BaseController } from './base.controller';
// import { CreateUserDTO } from '../dtos/customer-user/create-customer-user.dto';
import { UserService } from '../services';


export class UserController extends BaseController {
  // Add your methods and properties here
  public readonly userService: UserService
  // Example property
  constructor() {
    super();
    this.userService = new UserService();
  }  // Example method

  // public createUser = async (req: Request<{}, {}, CreateUserDTO>, res: Response): Promise<void> => {
  //   try {
  //     const userData = req.body;
  //     const user = await this.userService.createUser(userData);
  //     console.log(`Usuario creado: ${userData.username}`);
  //     this.httpResponse.Created(res, user, "Usuario creado correctamente");
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // }
}