import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { UserService } from "../services/user.service";


export class UserRoutes {
  static readonly path = "/user";
  public readonly router: Router;
  private readonly userController: UserController;
  constructor() {
    this.router = Router();
    this.userController = new UserController(new UserService());
    this.initializeRoutes();
  }
  private initializeRoutes() {
    this.router.get("/", this.userController.getAllUser);
    this.router.get("/:id", this.userController.getUserById);
    this.router.post("/", this.userController.createUser);
    this.router.put("/:id", this.userController.updateUser);
    this.router.delete("/:id", this.userController.deleteUser);
  }
}