import { Request, Response } from 'express';
import { LoginUseCase } from '../../../application/use-cases/login.user-case';
import { catchError } from '../../../utils';
import { CREATED, OK } from '../../../constants/http';
import { UserMapper } from '../../../application/mappers/user.mapper';
import { RegisterCustomerUseCase } from '../../../application/use-cases/register-customer.use-case';
import { VerifyEmailAccountUseCase } from '../../../application/use-cases/verify-email-account.use-case';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly verifyEmailAccountUseCase: VerifyEmailAccountUseCase,
  ) {}

  public login = catchError(async (req: Request, res: Response) => {
    const { email, username, password } = req.body;
    const { user, accessToken } = await this.loginUseCase.execute({
      email,
      username,
      password,
    });
    const userResponse = UserMapper.toResponseDto(user);
    return res.status(OK).json({
      message: 'Bienvenido a BurgerGO',
      user: userResponse,
      access_token: accessToken,
    });
  });
  public createCustomer = catchError(async (req: Request, res: Response) => {
    const userData = req.body;
    const data = await this.registerCustomerUseCase.execute(userData);
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
  });
  public verifyEmailAccount = catchError(
    async (req: Request, res: Response) => {
      const { token } = req.body;
      const { userId } = req.verificationSessionV2;
      const { user, access_token } =
        await this.verifyEmailAccountUseCase.execute({ token, userId });
      const userResponse = UserMapper.toResponseDto(user);
      return res.status(OK).json({
        message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
        user: userResponse,
        access_token,
      });
    },
  );
}
