import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { BaseController } from "./base.controller";
import { CreateEmployeeDTO } from "../dtos/employee-user/create-employee-user.dto";
import { LoginCustomerDTO } from '../dtos/auth/login-customer.dto';
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { LoginEmployeeDTO } from "../dtos/auth/login-employee.dto";

export class AuthController extends BaseController {
  private authService: AuthService;
  constructor() {
    super();
    this.authService = new AuthService();
  }

 
  public loginCustomer = async (req: Request<{}, {}, LoginCustomerDTO>, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await this.authService.loginCustomer({ email, password });
      this.httpResponse.OK(res, "Usuario logueado correctamente", user);
    } catch (error) {
      console.log('error', error);
      this.handleError(error, res);
    }
  }
  public loginEmployee = async (req: Request<{}, {}, LoginEmployeeDTO>, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      const user = await this.authService.loginEmployee({ username, password });
      this.httpResponse.OK(res, "Usuario logueado correctamente", user);
    } catch (error) {
      console.log('error', error);
      this.handleError(error, res);
    }
  }

  public registerCustomer = async (req: Request<{}, {}, CreateCustomerDTO>, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.authService.registerCustomerUser(userData);
      this.httpResponse.CREATED(res, "Usuario creado correctamente", user);
    } catch (error) {
      console.log('error', error);
      this.handleError(error, res);
    }
  }
  public registerEmployee = async (req: Request<{}, {}, CreateEmployeeDTO>, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.authService.registerEmployeeUser(userData);
      this.httpResponse.CREATED(res, "Usuario creado correctamente", user);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public getProfile = async (req: Request, res: Response):Promise<void> => {
    try {
      const user = req.user;
      const userData = await this.authService.getProfile(user.id);
      this.httpResponse.OK(res, "Usuario encontrado correctamente", userData);
    } catch (error) {
      this.handleError(error, res);
    }
  }
}