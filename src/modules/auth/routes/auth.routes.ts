import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { verifyToken } from '../../../middlewares/auth-token.middleware';
import { validateMiddlewareDTO } from '../../../middlewares/validation-dto';
import {
  ChangePasswordDTO,
  CreateCustomerDTO,
  LoginRequestDTO,
  UpdateCustomerUserDTO,
} from '../dto';
import {
  ResendVerificationDto,
  VerifyTokenDto,
} from '../../../dtos/emailVerification/verify-email.dto';

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
      '/confirm-account',
      validateMiddlewareDTO(VerifyTokenDto),
      authController.confirmAccount,
    );
    router.post(
      '/resend-verification',
      validateMiddlewareDTO(ResendVerificationDto),
      authController.resendVerificationEmail,
    );

    return router;
  }
}
