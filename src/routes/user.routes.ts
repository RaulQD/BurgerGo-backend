import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { validateMiddlewareDTO } from "../middlewares/validation-dto";
import { CreateCustomerDTO } from "../dtos/customer-user/create-customer-user.dto";
// import { UserService } from "../services/user.service";


const router = Router();
const userController = new UserController();


// router.get("/", userController.getAllUser);
// router.get("/:id", userController.getUserById);
// router.post("/", validateMiddlewareDTO(CreateCustomerDTO), userController.createUser);
// router.put("/:id", userController.updateUser);
// router.delete("/:id", userController.deleteUser);

export default router;