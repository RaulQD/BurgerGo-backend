import { AppError } from '../../../domain/errors/app-error.error';
import { NOT_FOUND } from '../../../domain/errors/http-status-code';
import { ITokenService } from '../../../domain/interfaces/token.interface';
import { IUserRepository } from '../../../domain/repository';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(oldRefreshToken: string) {
    const decoded = this.tokenService.verifyRefreshToken(oldRefreshToken);
    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('El usuario no existe', NOT_FOUND);
    }
    const newAccessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const newRefreshToken = this.tokenService.generateRefreshToken(
      user.id,
      user.email,
    );
    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
