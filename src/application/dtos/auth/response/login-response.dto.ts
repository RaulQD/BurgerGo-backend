import { UserResponseDto } from './user-reponse.dto';

export class LoginResponseDto {
  user: UserResponseDto;
  accessToken: string;
  message: string;
}
