import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateMiddlewareDTO } from "../middlewares/validation-dto";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { CreateEmployeeDTO } from "../dtos/employee-user/employee-user.dto";


const router = Router();
const authController = new AuthController();
router.post('/register-customer', validateMiddlewareDTO(CreateCustomerDTO), authController.registerCustomer);
router.post('/register-employee', validateMiddlewareDTO(CreateEmployeeDTO), authController.registerEmployee);


export default router;