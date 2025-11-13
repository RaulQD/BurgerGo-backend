import { Request, Response } from 'express';
import { CREATED, OK, UNAUTHORIZED } from '../../../constants/http';
import { AppError, catchError } from '../../../utils';
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
          'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.',
        data: {
          user: data.user,
          verification_session_token: data.verification_session_token,
          expires_in: data.expires_in,
          cooldown_seconds: data.cooldown_seconds,
        },
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
      const { userId } = req.verificationSession!;
      const { user, access_token } = await this.tokenService.verifyToken(
        token,
        userId,
      );
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
      const response = await this.tokenService.resendVerificationToken(email);
      return res.status(OK).json(response);
    },
  );
  public resendCode = catchError(async (req: Request, res: Response) => {
    if (!req.verificationSession?.userId)
      throw new AppError('Sesión de verificación invalida.', UNAUTHORIZED);
    const { userId } = req.verificationSession;
    const response = await this.tokenService.resendVerificationTokenV2(userId);
    return res.status(OK).json(response);
  });
}
