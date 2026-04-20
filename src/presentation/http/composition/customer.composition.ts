import { DataSource } from 'typeorm';
import { RolRepository } from '../../../infrastructure/repositories/rol.repository';

import { NodemailerEmailService } from '../../../infrastructure/services/nodemailer-email.service';
import { TypeOrmUnitOfWork } from '../../../infrastructure/database/typeorm/unit-of-work.typeorm';

import { BcryptPasswordHasher } from '../../../infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../../infrastructure/services/jwt-token.service';
import { CustomerController } from '../controller/customer.controller';

import {
  RolEntity,
  UserEntity,
} from '../../../infrastructure/database/typeorm/entities';

import { CustomerEntity } from '../../../infrastructure/database/typeorm/entities/customer.typeorm-entity';
import { UpdateCustomerUseCase } from '../../../application/use-cases/customer/profile/update-customer.user-case';
import {
  ChangePasswordUserCase,
  GetProfileUseCase,
  RegisterCustomerUseCase,
  VerifyAccessTokenUseCase,
} from '../../../application/use-cases';
import {
  CustomerRepository,
  UserRepository,
} from '../../../infrastructure/repositories';

export const composeCustomerController = (dataSource: DataSource) => {
  const userRepository = new UserRepository(
    dataSource.getRepository(UserEntity),
  );
  const rolRepository = new RolRepository(dataSource.getRepository(RolEntity));
  const customerRepository = new CustomerRepository(
    dataSource.getRepository(CustomerEntity),
  );

  const emailService = new NodemailerEmailService();
  const passwordHasher = new BcryptPasswordHasher();
  const unitOfWorkFactory = () => new TypeOrmUnitOfWork(dataSource);
  const tokenService = new JwtTokenService(
    process.env.ACCESS_TOKEN_SECRET || 'secret_key_sysburger',
    process.env.ACCESS_TOKEN_EXPIRY,
    process.env.TEMPORARY_TOKEN_SECRET,
    600,
  );
  const verifyAccessToken = new VerifyAccessTokenUseCase(
    userRepository,
    tokenService,
  );

  const customerUseCase = new RegisterCustomerUseCase(
    unitOfWorkFactory,
    rolRepository,
    passwordHasher,
    emailService,
    tokenService,
  );
  const updateCustomerUseCase = new UpdateCustomerUseCase(customerRepository);
  const getProfileUseCase = new GetProfileUseCase(
    userRepository,
    customerRepository,
  );
  const changePasswordUseCase = new ChangePasswordUserCase(
    userRepository,
    passwordHasher,
  );
  const customerController = new CustomerController(
    customerUseCase,
    updateCustomerUseCase,
    changePasswordUseCase,
    getProfileUseCase,
  );

  return { customerController, tokenService, verifyAccessToken };
};
