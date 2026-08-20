import {
  BAD_REQUEST,
  NOT_FOUND,
} from '../../../domain/errors/http-status-code';
import { User } from '../../../domain/entities';
import {
  IEmailVerificationRepository,
  IUserRepository,
} from '../../../domain/repository';
import { ITokenService } from '../../../domain/interfaces/token.interface';
import { AppError } from '../../../domain/errors/app-error.error';

export interface VerifyTokenResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export class VerifyEmailAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(token: string): Promise<VerifyTokenResponse> {
    let payload;
    try {
      payload = this.tokenService.verifyVerificationSessionToken(token);
    } catch (error) {
      throw new AppError(
        'El enlace de verificación es inválido o ha expirado.',
        BAD_REQUEST,
      );
    }
    const userId = payload.userId;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', NOT_FOUND);
    }
    if (user.email_verified) {
      throw new AppError(
        'El correo electronico ya ha sido verificado.',
        BAD_REQUEST,
      );
    }
    const emailVerification =
      await this.emailVerificationRepository.findActiveByUserId(userId);
    if (!emailVerification) {
      throw new AppError(
        'El enlace de verificación es inválido o ha expirado.',
        BAD_REQUEST,
      );
    }
    await this.userRepository.verifyEmail(userId);
    await this.emailVerificationRepository.invalidateUserToken(userId);
    user.email_verified = true;
    const access_token = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      user.email,
    );
    const response = {
      user: user,
      access_token: access_token,
      refresh_token: refresh_token,
    };
    return response;
  }
}
