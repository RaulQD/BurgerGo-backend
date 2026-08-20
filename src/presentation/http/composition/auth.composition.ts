import { DataSource } from 'typeorm';
import { AuthController } from '../controller/auth.controller';
import { BcryptPasswordHasher } from '../../../infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../../infrastructure/services/jwt-token.service';
import { EmailVerificationEntity } from '../../../infrastructure/database/typeorm/entities/email-verification.typeorm-entity';
import { NodemailerEmailService } from '../../../infrastructure/services/nodemailer-email.service';
import {
  LoginUseCase,
  ResendCodeUseCase,
  VerifyAccessTokenUseCase,
  VerifyEmailAccountUseCase,
  RefreshTokenUseCase,
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
import { envConfig } from '../../../infrastructure/config/env.config';

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
    envConfig.accessToken.secret,
    envConfig.accessToken.expiry,
    envConfig.temporaryToken.secret,
    envConfig.temporaryToken.expiration,
    envConfig.refreshToken.secret,
    envConfig.refreshToken.expiry,
  );
  //Use case
  const loginUseCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    tokenService,
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    userRepository,
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
    refreshTokenUseCase,
  );
  return { authController, tokenService, verifyAccessToken };
};
