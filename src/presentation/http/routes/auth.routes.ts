import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { LoginRequestDTO } from '../../../application/dtos/auth/request/login-request.dto';
import { createVerificationSessionMiddleware } from '../middlewares/auth/verification-session-token.middleware';
import { verifyToken } from '../middlewares/auth/auth-token.middleware';
import {
  ResendVerificationDto,
  VerifyTokenDto,
} from '../../../application/dtos/email/verify-email.dto';
import { validateMiddlewareDTO } from '../middlewares/validation/validation-dto';

export const AuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post(
    '/signin',
    validateMiddlewareDTO(LoginRequestDTO),
    authController.login,
  );
  router.post(
    '/verify-account',
    validateMiddlewareDTO(VerifyTokenDto),
    authController.verifyEmailAccount,
  );
  router.post(
    '/resend-code',
    validateMiddlewareDTO(ResendVerificationDto),
    authController.resendVerificationCode,
  );
  return router;
};
