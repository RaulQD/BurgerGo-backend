import { IUserRepository } from '../../domain/repository/user.repository.interface';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface';

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmedPassword: string;
}
export class ChangePasswordUserCase {
  constructor(
    public readonly userRepository: IUserRepository,
    public readonly passwordHasherd: IPasswordHasher,
  ) {}

  async changePassword(data: ChangePasswordRequest) {
    //verificar si el usuario existe
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new Error('El usuario no existe.');
    }
    //verificar que la contraseña actual sea la correcta
    const isCurrentPasswordValid = await this.passwordHasherd.compare(
      data.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new Error('La contraseña actual es incorrecta.');
    }
    //Verificar que la nuevacontrañsea y la confirmación de la nueva contraseña sean igualas
    const isMatchPassword = data.newPassword !== data.confirmedPassword;
    if (isMatchPassword) {
      throw new Error('La nueva contraseña y su confirmación no coinciden');
    }
    //verficar que la nueva contraseña sea diferente
    const isSameAsOld = await this.passwordHasherd.compare(
      data.newPassword,
      user.password,
    );
    if (isSameAsOld) {
      throw new Error(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }
    const hashedPassword = await this.passwordHasherd.hash(data.newPassword);
    user.password = hashedPassword;
    await this.userRepository.update(user);
  }
}
