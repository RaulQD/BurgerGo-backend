import { Router } from "express";
import { AddressController } from "../controllers/address.controller";
import { verifyToken } from "../middlewares/auth-token.middleware";

export class AddressRoutes {
  static get routes(): Router {
    const router = Router();
    const addressController = new AddressController();
    router.get('/', verifyToken, addressController.getAddresses);
    router.post('/', verifyToken, addressController.createAddress);
    router.delete('/:addressId', verifyToken, addressController.deleteAddress);

    return router;
  }
}