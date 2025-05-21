import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { CreateEmployeeDTO } from "../dtos/employee-user/employee-user.dto";
import { AuthService } from "../services/auth.service";
import { BaseController } from "./base.controller";
import { Request, Response } from "express";

export class AuthController extends BaseController {
  private authService: AuthService;
  constructor() {
    super();
    this.authService = new AuthService();
  }

  /**
   * @description Register
   * @param req - Request object
   * @param res - Response object
   * @returns {Promise<void>}
   */
  public registerCustomer = async (req: Request<{}, {}, CreateCustomerDTO>, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.authService.registerCustomerUser(userData);
      this.httpResponse.CREATED(res, "Usuario creado correctamente", user);
    } catch (error) {
      this.handleError(error, res);
    }
  }
  public registerEmployee = async (req: Request<{}, {}, CreateEmployeeDTO>, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.authService.registerEmployeeUser(userData);
      this.httpResponse.CREATED(res, "Usuario creado correctamente",user);
    } catch (error) {
      this.handleError(error, res);
    }
  }

}