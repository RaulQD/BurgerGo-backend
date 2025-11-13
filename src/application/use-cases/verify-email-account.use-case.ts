import { BAD_REQUEST, NOT_FOUND } from '../../constants/http';
import { User } from '../../domain/entities/user.entity';
import {
  IEmailVerificationRepository,
  IUserRepository,
} from '../../domain/repository';
import { ITokenService } from '../../domain/services/token.service.interface';
import { AppError } from '../../utils';

export interface VerifyTokenRequest {
  token: string;
  userId: string;
}

export interface VerifyTokenResponse {
  user: User;
  access_token: string;
}

export class VerifyEmailAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailVerificationRepository: IEmailVerificationRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    const { token, userId } = data;
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
      await this.emailVerificationRepository.findActiveByToken(token);
    if (!emailVerification) {
      throw new AppError('token inválido o expirado', BAD_REQUEST);
    }
    if (emailVerification.user_id !== userId) {
      throw new AppError('Token invalido para este usuario', BAD_REQUEST);
    }
    await this.emailVerificationRepository.markAsVerified(emailVerification.id);
    user.email_verified = true;
    const updatedUser = await this.userRepository.update(user);
    const accessToken = this.tokenService.generateAccessToken(
      updatedUser.id,
      updatedUser.email,
    );
    const response = {
      user: updatedUser,
      access_token: accessToken,
    };
    return response;
  }
}
