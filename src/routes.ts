import { Router } from "express";

import { AuthRoutes } from "./routes/auth.routes";
import { UserRoutes } from "./routes/user.routes";
import { AddressRoutes } from "./routes/address.routes";
export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    router.use('/api/auth', AuthRoutes.routes);
    router.use('/api/user', UserRoutes.routes);
    router.use('/api/address', AddressRoutes.routes);
    // router.use('/api/rol', RolRoutes.routes);


    return router;
  }
}