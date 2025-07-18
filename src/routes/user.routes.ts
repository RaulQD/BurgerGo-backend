import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { validateMiddlewareDTO } from "../middlewares/validation-dto";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
import { verifyToken } from "../middlewares/authToken";
// import { UserService } from "../services/user.service";

export class UserRoutes {

  static get routes(): Router {
    const router = Router();
    const userController = new UserController();

    router.get("/:id", verifyToken, userController.getUserById);
    return router;
  }
}
