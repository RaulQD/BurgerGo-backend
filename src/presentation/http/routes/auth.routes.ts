import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { LoginRequestDTO } from '../../../application/dtos/auth/request/login-request.dto';
import { CreateCustomerDTO } from '../../../application/dtos/customer-user/request/create-customer-user.dto';
import { createVerificationSessionMiddleware } from '../middlewares/auth/verification-session-token.middleware';
import { VerifyTokenDto } from '../../../application/dtos/email/verify-email.dto';
import { validateMiddlewareDTO } from '../middlewares/validation/validation-dto';
import { ITokenService } from '../../../domain/services/token.service.interface';

export const AuthRoutes = (
  authController: AuthController,
  tokenServices: ITokenService,
): Router => {
  const router = Router();
  const validateSessionTokenMiddleware =
    createVerificationSessionMiddleware(tokenServices);

  router.post(
    '/signin',
    validateMiddlewareDTO(LoginRequestDTO),
    authController.login,
  );
  router.post(
    '/signup',
    validateMiddlewareDTO(CreateCustomerDTO),
    authController.createCustomer,
  );
  router.post(
    '/verify-account',
    validateSessionTokenMiddleware,
    validateMiddlewareDTO(VerifyTokenDto),
    authController.verifyEmailAccount,
  );
  return router;
};
