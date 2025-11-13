import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import {
  ChangePasswordDTO,
  CreateCustomerDTO,
  LoginRequestDTO,
  UpdateCustomerUserDTO,
} from '../dto';
import { VerifyTokenDto } from '../../../dtos/emailVerification/verify-email.dto';
import { verifyToken } from '../../../middleware/auth-token.middleware';
import { validateMiddlewareDTO } from '../../../middleware/validation-dto';
import { verificationSessionMiddleware } from '../../../middleware/verification-session-token.middleware';

export class AuthRoutes {
  static get routes(): Router {
    const router = Router();
    const authController = new AuthController();

    router.get('/profile', verifyToken, authController.getProfile);
    router.post(
      '/create',
      validateMiddlewareDTO(CreateCustomerDTO),
      authController.registerCustomer,
    );
    router.post(
      '/login',
      validateMiddlewareDTO(LoginRequestDTO),
      authController.login,
    );
    router.put(
      '/update-customer-profile',
      verifyToken,
      validateMiddlewareDTO(UpdateCustomerUserDTO),
      authController.updateCustomerProfile,
    );
    router.patch(
      '/change-password',
      validateMiddlewareDTO(ChangePasswordDTO),
      verifyToken,
      authController.changePassword,
    );
    router.post(
      '/verify-account',
      validateMiddlewareDTO(VerifyTokenDto),
      verificationSessionMiddleware,
      authController.confirmAccount,
    );
    router.post(
      '/resend-code',
      verificationSessionMiddleware,
      authController.resendCode,
    );

    return router;
  }
}
