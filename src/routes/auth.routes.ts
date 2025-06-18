import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateMiddlewareDTO } from '../middlewares/validation-dto';
import { verifyToken } from "../middlewares/authToken";
import { ChangePasswordDTO, CreateCustomerDTO, CreateEmployeeDTO, LoginCustomerDTO, LoginEmployeeDTO, UpdateCustomerUserDTO } from "../dtos";


export class AuthRoutes {


  static get routes(): Router {
    const router = Router();
    const authController = new AuthController();
    router.get('/profile', verifyToken, authController.getProfile);
    router.post('/register-customer', validateMiddlewareDTO(CreateCustomerDTO), authController.registerCustomer);
    router.post('/register-employee', validateMiddlewareDTO(CreateEmployeeDTO), authController.registerEmployee);
    router.post('/customer', validateMiddlewareDTO(LoginCustomerDTO), authController.loginCustomer);
    router.post('/employee', validateMiddlewareDTO(LoginEmployeeDTO), authController.loginEmployee);
    router.put('/update-customer-profile', verifyToken, validateMiddlewareDTO(UpdateCustomerUserDTO), authController.updateCustomerProfile);
    router.patch('/change-password', validateMiddlewareDTO(ChangePasswordDTO), verifyToken, authController.changePassword);


    return router;
  }


}


// const router = Router();
// const authController = new AuthController();
// router.post('/register-customer', validateMiddlewareDTO(CreateCustomerDTO), authController.registerCustomer);
// router.post('/register-employee', validateMiddlewareDTO(CreateEmployeeDTO), authController.registerEmployee);


// export default router;