import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repository/user.repository.interface';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface';
import { ITokenService } from '../../domain/services/token.service.interface';
import { AppError } from '../../utils/app-error-utils';
import { BAD_REQUEST, UNAUTHORIZED } from '../../constants/http';

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}
export interface LoginResponse {
  user: User;
  accessToken: string;
}

export class LoginUseCase {
  constructor(
    public readonly userRepository: IUserRepository,
    public readonly passwordHasher: IPasswordHasher,
    public readonly tokenService: ITokenService,
  ) {}

  async execute(data: LoginRequest): Promise<LoginResponse> {
    // buscar usuario por emial
    let user: User | null = null;
    if (data.email) {
      user = await this.userRepository.findByEmail(data.email.toLowerCase());
    } else if (data.username) {
      user = await this.userRepository.findByUserName(
        data.username.toLowerCase(),
      );
    }
    if (!user) {
      throw new AppError(
        'El usuario o la contraseña son incorrectos.',
        UNAUTHORIZED,
      );
    }
    //verificar que el email este verificado
    if (!user.canLogin()) {
      throw new AppError(
        'Por favor, verifica tu correo electronico antes de iniciar sesión.',
        BAD_REQUEST,
      );
    }
    //comprar contraseñas
    const isPasswordValid = await this.passwordHasher.compare(
      data.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new AppError(
        'El usuario o la contraseña son incorrectos.',
        UNAUTHORIZED,
      );
    }
    const accessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    return { user, accessToken };
  }
}
