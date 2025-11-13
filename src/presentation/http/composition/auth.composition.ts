import { DataSource } from 'typeorm';
import { AuthController } from '../controller/auth.controller';
import { UserRepository } from '../../../infrastructure/repositories/user.repository';
import { UserEntity } from '../../../infrastructure/database/typeorm/entities/user.typeorm-entity';
import { BcryptPasswordHasher } from '../../../infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../../infrastructure/services/jwt-token.service';
import { LoginUseCase } from '../../../application/use-cases/login.user-case';
import { RegisterCustomerUseCase } from '../../../application/use-cases/register-customer.use-case';
import { NodemailerEmailService } from '../../../infrastructure/services/nodemailer-email.service';
import { RolRepository } from '../../../infrastructure/repositories/rol.repository';
import { RolEntity } from '../../../infrastructure/database/typeorm/entities/rol.typeorm-entity';
import { TypeOrmUnitOfWork } from '../../../infrastructure/database/typeorm/unit-of-work.typeorm';
import { VerifyEmailAccountUseCase } from '../../../application/use-cases/verify-email-account.use-case';
import { EmailVerificationRepository } from '../../../infrastructure/repositories/email-verification.repository';
import { EmailVerificationEntity } from '../../../infrastructure/database/typeorm/entities/email-verification.typeorm-entity';

export const composeAuthController = (dataSource: DataSource) => {
  const userRepository = new UserRepository(
    dataSource.getRepository(UserEntity),
  );

  //Services
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(
    process.env.ACCESS_TOKEN_SECRET || 'secret_key_sysburger',
    process.env.ACCESS_TOKEN_EXPIRY,
    process.env.TEMPORARY_TOKEN_SECRET,
    600,
  );

  const rolRepository = new RolRepository(dataSource.getRepository(RolEntity));
  const emailVerificationRepository = new EmailVerificationRepository(
    dataSource.getRepository(EmailVerificationEntity),
  );
  const emailService = new NodemailerEmailService();

  const unitOfWorkFactory = () => new TypeOrmUnitOfWork(dataSource);

  //Use case
  const loginUseCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    tokenService,
  );
  const customerUseCase = new RegisterCustomerUseCase(
    unitOfWorkFactory,
    rolRepository,
    passwordHasher,
    emailService,
    tokenService,
  );

  const verifyEmailAccount = new VerifyEmailAccountUseCase(
    userRepository,
    emailVerificationRepository,
    tokenService,
  );
  const authController = new AuthController(
    loginUseCase,
    customerUseCase,
    verifyEmailAccount,
  );
  return { authController, tokenService };
};
