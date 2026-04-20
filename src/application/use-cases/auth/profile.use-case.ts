import { NOT_FOUND } from '../../../domain/errors/http-status-code';
import { Customer } from '../../../domain/entities/customer.entity';
import { User } from '../../../domain/entities/user.entity';
import {
  ICustomerRepository,
  IUserRepository,
} from '../../../domain/repository';
import { AppError } from '../../../domain/errors/app-error.error';

export interface ProfileResponse {
  user: User;
  customer: Customer | null;
}

export class GetProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(userId: string): Promise<ProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuario no existe', NOT_FOUND);
    }
    let customer: Customer | null = null;
    if (user.isCustomer()) {
      customer = await this.customerRepository.findByUserId(userId);
    }
    return { user, customer };
  }
}
