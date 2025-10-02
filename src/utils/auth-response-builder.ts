import { JwtConfig } from '../config/jwt.config';
import { UserEntity } from '../entities';

export class AuthResponseBuilder {
  static buildAuthResponse(user: UserEntity) {
    const token = JwtConfig.generateToken(user);
    const baseUser = { id: user.id, rol: user.rol.name };
    const identifier = user.employee
      ? { username: user.username }
      : { email: user.email };
    const customerData = user.customer ? { customer: user.customer } : {};
    const employeeData = user.employee ? { employee: user.employee } : {};
    return {
      user: {
        ...baseUser,
        ...identifier,
        ...customerData,
        ...employeeData,
      },
      access_token: token,
    };
  }
}
