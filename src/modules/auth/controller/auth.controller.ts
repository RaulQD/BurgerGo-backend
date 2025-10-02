import { Request, Response } from 'express';
import { CREATED, OK } from '../../../constants/http';
import { catchError } from '../../../utils';
import { VerifyTokenDto } from '../../../dtos/emailVerification/verify-email.dto';
import { TokenEmailService } from '../../../services/token.service';
import { AuthService } from '../services/auth.service';
import {
  ChangePasswordDTO,
  CreateCustomerDTO,
  LoginRequestDTO,
  UpdateCustomerUserDTO,
} from '../dto';

export class AuthController {
  private authService: AuthService;
  private tokenService: TokenEmailService;
  constructor() {
    this.authService = new AuthService();
    this.tokenService = new TokenEmailService();
  }

  public login = catchError(
    async (req: Request<{}, {}, LoginRequestDTO>, res: Response) => {
      const { email, username, password } = req.body;
      const { access_token, user } = await this.authService.login({
        email,
        username,
        password,
      });
      return res.status(OK).json({
        message: 'Bienvenido a BurgerGO',
        user,
        access_token,
      });
    },
  );

  public registerCustomer = catchError(
    async (req: Request<{}, {}, CreateCustomerDTO>, res: Response) => {
      const userData = req.body;
      const data = await this.authService.registerCustomerUser(userData);
      return res.status(CREATED).json({
        message:
          'Cuenta creada exitosamente. Por favor verifica tu email antes de continuar.',
        data,
        email_sent: true,
      });
    },
  );

  public getProfile = catchError(async (req: Request, res: Response) => {
    const user = req.user;
    const customer = await this.authService.getProfile(user.id);
    return res.status(OK).json({ data: customer });
  });

  public updateCustomerProfile = catchError(
    async (req: Request<{}, {}, UpdateCustomerUserDTO>, res: Response) => {
      const userId = req.user.id;
      const customerData = req.body;
      const data = await this.authService.updateCustomerProfile(
        userId,
        customerData,
      );
      return res.status(OK).json({
        message: 'Perfil actualizado correctamente',
        data,
      });
    },
  );

  public changePassword = catchError(
    async (req: Request<{}, {}, ChangePasswordDTO>, res: Response) => {
      const userId = req.user.id;
      const passwordData = req.body;
      await this.authService.changePassword(userId, passwordData);
      return res
        .status(OK)
        .json({ message: 'Contraseña actualizada correctamente' });
    },
  );

  public confirmAccount = catchError(
    async (req: Request<{}, {}, VerifyTokenDto>, res: Response) => {
      const { token } = req.body;
      const { user, access_token } = await this.tokenService.verifyToken(token);
      return res.status(OK).json({
        message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
        user,
        access_token,
      });
    },
  );
  public resendVerificationEmail = catchError(
    async (req: Request, res: Response) => {
      const { email } = req.body;
      await this.tokenService.resendVerificationToken(email);
      return res.status(OK).json({
        message:
          'Correo de verificación reenviado. Por favor revisa tu bandeja de entrada.',
      });
    },
  );
}
