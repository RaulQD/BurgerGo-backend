import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repository/user.repository.interface';
import { ITokenService } from '../../domain/services/token.service.interface';

export class VerifyAccessTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}
  async execute(token: string): Promise<User> {
    const decoded = this.tokenService.verifyAccessToken(token);
    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }
    return user;
  }
}
