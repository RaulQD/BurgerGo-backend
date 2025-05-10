import { Router } from "express";
import { UserRoutes } from "./userRoutes";



export class AppRoutes { 
    static get routes(): Router {
        const router = Router();
        router.use(UserRoutes.path, new UserRoutes().router);
        return router;
    }
}