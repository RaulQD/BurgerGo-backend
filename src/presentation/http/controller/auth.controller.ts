import { Request, Response } from 'express';
import { OK } from '../../../domain/errors/http-status-code';
import { UserMapper } from '../../../application/mappers/user.mapper';
import {
  LoginUseCase,
  ResendCodeUseCase,
  VerifyEmailAccountUseCase,
} from '../../../application/use-cases';
import { catchError } from '../middlewares/catch-error.middleware';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyEmailAccountUseCase: VerifyEmailAccountUseCase,
    private readonly resendCodeUseCase: ResendCodeUseCase,
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

  public verifyEmailAccount = catchError(
    async (req: Request, res: Response) => {
      const { token } = req.body;
      const { user, access_token } =
        await this.verifyEmailAccountUseCase.execute(token);
      const userResponse = UserMapper.toResponseDto(user);
      return res.status(OK).json({
        message:
          'Cuenta verificada correctamente. Ahora puedes acceder a la plataforma.',
        user: userResponse,
        access_token,
      });
    },
  );
  public resendVerificationCode = catchError(
    async (req: Request, res: Response) => {
      const { email } = req.body;
      const data = await this.resendCodeUseCase.execute(email);
      return res.status(OK).json({
        message: 'Un nuevo enlace de verificación ha sido enviado a tu correo.',
        data: data,
      });
    },
  );
}
