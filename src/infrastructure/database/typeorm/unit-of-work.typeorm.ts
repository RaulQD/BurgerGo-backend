import { DataSource, QueryRunner } from 'typeorm';
import { IUnitOfWork } from '../../../domain/repository/unit-of-work.interface';
import { IUserRepository } from '../../../domain/repository/user.repository.interface';
import { ICustomerRepository } from '../../../domain/repository/customer.repository.interface';
import { IEmailVerificationRepository } from '../../../domain/repository/email-verification.repository.interface';
import { UserRepository } from '../../repositories/user.repository';
import { CustomerRepository } from '../../repositories/customer.repository';
import { EmailVerificationRepository } from '../../repositories/email-verification.repository';
import { UserEntity } from './entities/user.typeorm-entity';
import { CustomerEntity } from './entities/customer.typeorm-entity';
import { EmailVerificationEntity } from './entities/email-verification.typeorm-entity';

export class TypeOrmUnitOfWork implements IUnitOfWork {
  private queryRunner: QueryRunner;

  // Repositorios transaccionales
  public userRepository: IUserRepository;
  public customerRepository: ICustomerRepository;
  public emailVerificationRepository: IEmailVerificationRepository;

  constructor(private readonly dataSource: DataSource) {
    this.queryRunner = this.dataSource.createQueryRunner();

    // Inicializar repositorios con el queryRunner
    this.userRepository = new UserRepository(
      this.queryRunner.manager.getRepository(UserEntity),
    );
    this.customerRepository = new CustomerRepository(
      this.queryRunner.manager.getRepository(CustomerEntity),
    );
    this.emailVerificationRepository = new EmailVerificationRepository(
      this.queryRunner.manager.getRepository(EmailVerificationEntity),
    );
  }

  async startTransaction(): Promise<void> {
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    await this.queryRunner.commitTransaction();
  }

  async rollback(): Promise<void> {
    if (this.queryRunner.isTransactionActive) {
      await this.queryRunner.rollbackTransaction();
    }
  }

  release(): void {
    this.queryRunner.release();
  }
}
