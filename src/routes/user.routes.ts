import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export class UserRoutes {

  static routes(): Router {
    const router = Router();
    const userController = new UserController();
    // Define the routes
    router.get("/users", userController.getAllUser);
    router.post("/users", userController.createUser);
    router.get("/users/:id", userController.getUserById);
    router.put("/users/:id", userController.updateUser);
    router.delete("/users/:id", userController.deleteUser);
    return router;
  }
}