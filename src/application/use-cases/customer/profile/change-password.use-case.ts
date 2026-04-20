import {
  BAD_REQUEST,
  CONFLICT,
  NOT_FOUND,
} from '../../../../domain/errors/http-status-code';
import { IUserRepository } from '../../../../domain/repository';
import { IPasswordHasher } from '../../../../domain/interfaces/password-hasher.interface';
import { AppError } from '../../../../domain/errors/app-error.error';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmedPassword: string;
}
export class ChangePasswordUserCase {
  constructor(
    public readonly userRepository: IUserRepository,
    public readonly passwordHasherd: IPasswordHasher,
  ) {}

  async execute(userId: string, data: ChangePasswordRequest) {
    //verificar si el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('El usuario no existe.', NOT_FOUND);
    }
    //verificar que la contraseña actual sea la correcta
    const isCurrentPasswordValid = await this.passwordHasherd.compare(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new AppError('La contraseña actual es incorrecta.', BAD_REQUEST);
    }
    //Verificar que la nuevacontrañsea y la confirmación de la nueva contraseña sean igualas
    const isMatchPassword = data.newPassword !== data.confirmedPassword;
    if (isMatchPassword) {
      throw new AppError(
        'La nueva contraseña y su confirmación no coinciden',
        CONFLICT,
      );
    }
    //verficar que la nueva contraseña sea diferente
    const isSameAsOld = await this.passwordHasherd.compare(
      data.newPassword,
      user.password,
    );
    if (isSameAsOld) {
      throw new AppError(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
        CONFLICT,
      );
    }
    const hashedPassword = await this.passwordHasherd.hash(data.newPassword);
    user.password = hashedPassword;
    await this.userRepository.update(user);
  }
}
