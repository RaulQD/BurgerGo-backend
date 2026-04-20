import { Router } from 'express';

import { CustomerController } from '../controller/customer.controller';
import { verifyToken } from '../middlewares/auth/auth-token.middleware';
import { validateMiddlewareDTO } from '../middlewares/validation/validation-dto';

import { VerifyAccessTokenUseCase } from '../../../application/use-cases';
import { ChangePasswordDTO } from '../../../application/dtos/customer-user/request/change-password.dto';
import { UpdateCustomerUserDTO } from '../../../application/dtos/customer-user/request/update-customer-user.dto';
import { CreateCustomerDTO } from '../../../application/dtos/customer-user/request/create-customer-user.dto';

export const CustomerRoutes = (
  customerController: CustomerController,
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase,
) => {
  const router = Router();

  const validateAccessTokenMiddleware = verifyToken(verifyAccessTokenUseCase);

  router.post(
    '/signup',
    validateMiddlewareDTO(CreateCustomerDTO),
    customerController.createCustomer,
  );

  router.patch(
    '/profile',
    validateAccessTokenMiddleware,
    validateMiddlewareDTO(UpdateCustomerUserDTO),
    customerController.updateCustomer,
  );
  router.get(
    '/profile',
    validateAccessTokenMiddleware,
    customerController.getProfile,
  );
  router.patch(
    '/change-password',
    validateAccessTokenMiddleware,
    validateMiddlewareDTO(ChangePasswordDTO),
    customerController.changePassword,
  );
  return router;
};
