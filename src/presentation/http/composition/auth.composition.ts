import { DataSource } from 'typeorm';
import { AuthController } from '../controller/auth.controller';
import { BcryptPasswordHasher } from '../../../infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../../infrastructure/services/jwt-token.service';
import { EmailVerificationEntity } from '../../../infrastructure/database/typeorm/entities/email-verification.typeorm-entity';
import { NodemailerEmailService } from '../../../infrastructure/services/nodemailer-email.service';
import {
  GetProfileUseCase,
  LoginUseCase,
  ResendCodeUseCase,
  VerifyAccessTokenUseCase,
  VerifyEmailAccountUseCase,
} from '../../../application/use-cases';
import {
  CustomerRepository,
  EmailVerificationRepository,
  UserRepository,
} from '../../../infrastructure/repositories';
import {
  CustomerEntity,
  UserEntity,
} from '../../../infrastructure/database/typeorm/entities';

export const composeAuthController = (dataSource: DataSource) => {
  const userRepository = new UserRepository(
    dataSource.getRepository(UserEntity),
  );
  const customerRepository = new CustomerRepository(
    dataSource.getRepository(CustomerEntity),
  );
  const emailVerificationRepository = new EmailVerificationRepository(
    dataSource.getRepository(EmailVerificationEntity),
  );
  //Services
  const emailService = new NodemailerEmailService();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(
    process.env.ACCESS_TOKEN_SECRET || 'secret_key_sysburger',
    process.env.ACCESS_TOKEN_EXPIRY,
    process.env.TEMPORARY_TOKEN_SECRET,
    600,
  );
  //Use case
  const loginUseCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    tokenService,
  );

  const verifyEmailAccount = new VerifyEmailAccountUseCase(
    userRepository,
    emailVerificationRepository,
    tokenService,
  );
  const verifyAccessToken = new VerifyAccessTokenUseCase(
    userRepository,
    tokenService,
  );
  const resendCodeUseCase = new ResendCodeUseCase(
    userRepository,
    emailVerificationRepository,
    customerRepository,
    emailService,
    tokenService,
  );

  const authController = new AuthController(
    loginUseCase,
    verifyEmailAccount,
    resendCodeUseCase,
  );
  return { authController, tokenService, verifyAccessToken };
};
