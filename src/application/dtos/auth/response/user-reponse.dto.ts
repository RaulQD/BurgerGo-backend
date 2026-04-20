export class UserResponseDto {
  id: string;
  email: string;
  rol: string;
  email_verified: boolean;
  customer?: {
    id: string;
    name: string;
    last_name: string;
    dni: string;
    phone: string;
    birthday?: Date;
  } | null;
  employee?: {
    id: string;
    name: string;
    last_name: string;
  } | null;
}
