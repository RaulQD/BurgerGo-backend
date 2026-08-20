import { Request, Response } from 'express';
import { OK, UNAUTHORIZED } from '../../../domain/errors/http-status-code';
import { UserMapper } from '../../../application/mappers/user.mapper';
import {
  LoginUseCase,
  ResendCodeUseCase,
  VerifyEmailAccountUseCase,
} from '../../../application/use-cases';
import { catchError } from '../middlewares/catch-error.middleware';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyEmailAccountUseCase: VerifyEmailAccountUseCase,
    private readonly resendCodeUseCase: ResendCodeUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  public login = catchError(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await this.loginUseCase.execute(
      {
        email,
        password,
      },
    );
    const userResponse = UserMapper.toResponseDto(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    return res.status(OK).json({
      message: 'Bienvenido a BurgerGO',
      user: userResponse,
      access_token: accessToken,
    });
  });

  public verifyEmailAccount = catchError(
    async (req: Request, res: Response) => {
      const { token } = req.body;
      const { user, access_token, refresh_token } =
        await this.verifyEmailAccountUseCase.execute(token);
      const userResponse = UserMapper.toResponseDto(user);
      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });
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
  public refreshToken = catchError(async (req: Request, res: Response) => {
    const currentRefreshToken = req.cookies.refreshToken;
    if (!currentRefreshToken) {
      return res.status(UNAUTHORIZED).json({
        error: ' Refresh token no proporcionado',
      });
    }
    const tokens = await this.refreshTokenUseCase.execute(currentRefreshToken);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    return res.status(OK).json({
      message: 'Token actualizado correctamente',
      access_token: tokens.accessToken,
    });
  });
}
