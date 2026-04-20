import { Customer, User } from '../../domain/entities';
import { UserResponseDto } from '../dtos/auth/response/user-reponse.dto';

export class UserMapper {
  static toResponseDto(
    user: User,
    customer?: Customer | null,
  ): UserResponseDto {
    const response: UserResponseDto = {
      id: user.id,
      email: user.email,
      rol: user.rol_name,
      email_verified: user.email_verified,
    };
    if (customer) {
      response.customer = {
        id: customer.id,
        name: customer.name,
        last_name: customer.last_name,
        dni: customer.dni,
        phone: customer.phone,
        ...(customer.birthdate && {
          birthdate:
            customer.birthdate instanceof Date
              ? customer.birthdate.toISOString().split('T')[0]
              : String(customer.birthdate).split('T')[0],
        }),
      };
    }
    return response;
  }
}
