import { User } from '../../domain/entities/user.entity';
import { UserResponseDto } from '../dtos/auth/response/user-reponse.dto';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      type: user.type,
      email_verified: user.email_verified,
    };
  }
}
