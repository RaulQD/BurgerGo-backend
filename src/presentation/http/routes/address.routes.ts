import { Router } from 'express';
import { AddressController } from '../controller/address.controller';
import { verifyToken } from '../middlewares/auth/auth-token.middleware';
import { VerifyAccessTokenUseCase } from '../../../application/use-cases';
import { validateMiddlewareDTO } from '../middlewares/validation/validation-dto';
import { CreateCustomerAddressDto } from '../../../application/dtos/address/request/create-address.dto';
import { UpdatedAddressCustomerDto } from '../../../application/dtos/address/request/update-address.dto';
export const AddressRoutes = (
  addressController: AddressController,
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase,
) => {
  const router = Router();
  const validateAccessTokenMiddleware = verifyToken(verifyAccessTokenUseCase);

  router.get(
    '/',
    validateAccessTokenMiddleware,
    addressController.getAddressesCustomer,
  );
  router.post(
    '/',
    validateAccessTokenMiddleware,
    validateMiddlewareDTO(CreateCustomerAddressDto),
    addressController.createAddressCustomer,
  );
  router.put(
    '/:addressId',
    validateAccessTokenMiddleware,
    validateMiddlewareDTO(UpdatedAddressCustomerDto),
    addressController.updateAddressCustomer,
  );
  router.delete(
    '/:addressId',
    validateAccessTokenMiddleware,
    addressController.deleteAddressCustomer,
  );
  router.patch(
    '/:addressId',
    validateAccessTokenMiddleware,
    addressController.setDefaultAddress,
  );
  return router;
};
