import { IUserRepository } from './user.repository.interface';
import { ICustomerRepository } from './customer.repository.interface';
import { IEmailVerificationRepository } from './email-verification.repository.interface';

export interface IUnitOfWork {
  // Repositorios transaccionales
  userRepository: IUserRepository;
  customerRepository: ICustomerRepository;
  emailVerificationRepository: IEmailVerificationRepository;

  // Métodos de control de transacción
  startTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}
