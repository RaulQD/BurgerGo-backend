import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { CREATED, OK } from "../constants/http";
import { ChangePasswordDTO, CreateCustomerDTO, CreateEmployeeDTO, LoginCustomerDTO, LoginEmployeeDTO, UpdateCustomerUserDTO } from "../dtos";
import { catchError } from "../utils";

export class AuthController {
  private authService: AuthService;
  constructor() {
    this.authService = new AuthService();
  }


  public loginCustomer = catchError(async (req: Request<{}, {}, LoginCustomerDTO>, res: Response) => {

    const { email, password } = req.body;
    const { access_token } = await this.authService.loginCustomer({ email, password });
    return res.status(OK).json({
      message: "Bienvenido a BurgerGO",
      access_token,
    });

  })
  public loginEmployee = catchError(async (req: Request<{}, {}, LoginEmployeeDTO>, res: Response) => {

    const { username, password } = req.body;
    const user = await this.authService.loginEmployee({ username, password });
    return res.status(OK).json({
      message: "Bienvenido a BurgerGO",
      user
    })


  });

  public registerCustomer = catchError(async (req: Request<{}, {}, CreateCustomerDTO>, res: Response) => {
    const userData = req.body;
    const user = await this.authService.registerCustomerUser(userData);
    return res.status(CREATED).json({ message: "Tu cuenta ha sido creada exitosamente.", user })
  })
  public registerEmployee = catchError(async (req: Request<{}, {}, CreateEmployeeDTO>, res: Response) => {
    const userData = req.body;
    const user = await this.authService.registerEmployeeUser(userData);
    return res.status(CREATED).json({ message: "Tu cuenta ha sido creada exitosamente.", user });
  })

  public getProfile = catchError(async (req: Request, res: Response) => {
    const user = req.user;
    const customer = await this.authService.getProfile(user.id);
    return res.status(OK).json({ data: customer });
  })

  public updateCustomerProfile = catchError(async (req: Request<{}, {}, UpdateCustomerUserDTO>, res: Response) => {

    const userId = req.user.id;
    const customerData = req.body;
    const data = await this.authService.updateCustomerProfile(userId, customerData);
    return res.status(OK).json({
      message: "Perfil actualizado correctamente",
      data
    });
  })

  public changePassword = catchError(async (req: Request<{}, {}, ChangePasswordDTO>, res: Response) => {
    const userId = req.user.id;
    const passwordData = req.body;
    await this.authService.changePassword(userId, passwordData);
    return res.status(OK).json({ message: "Contraseña actualizada correctamente" })
  })
}