import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateMiddlewareDTO } from '../middlewares/validation-dto';
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { CreateEmployeeDTO } from "../dtos/employee-user/create-employee-user.dto";
import { LoginCustomerDTO } from "../dtos/auth/login-customer.dto";
import { verifyToken } from "../middlewares/authToken";
import { LoginEmployeeDTO } from "../dtos/auth/login-employee.dto";


export class AuthRoutes {


  static get routes(): Router {
    const router = Router();
    const authController = new AuthController();
    router.get('/profile',verifyToken, authController.getProfile);
    router.post('/register-customer', validateMiddlewareDTO(CreateCustomerDTO), authController.registerCustomer);
    router.post('/register-employee', validateMiddlewareDTO(CreateEmployeeDTO), authController.registerEmployee);
    router.post('/customer', validateMiddlewareDTO(LoginCustomerDTO), authController.loginCustomer);
    router.post('/employee', validateMiddlewareDTO(LoginEmployeeDTO), authController.loginEmployee);
    return router;
  }


}


// const router = Router();
// const authController = new AuthController();
// router.post('/register-customer', validateMiddlewareDTO(CreateCustomerDTO), authController.registerCustomer);
// router.post('/register-employee', validateMiddlewareDTO(CreateEmployeeDTO), authController.registerEmployee);


// export default router;