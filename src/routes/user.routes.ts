import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { verifyToken } from '../middleware/auth-token.middleware';
// import { UserService } from "../services/user.service";

export class UserRoutes {
  static get routes(): Router {
    const router = Router();
    const userController = new UserController();

    router.get('/:id', verifyToken, userController.getUserById);
    return router;
  }
}
