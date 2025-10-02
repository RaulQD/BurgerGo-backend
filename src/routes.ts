import { Router } from 'express';

import { UserRoutes } from './routes/user.routes';
import { AddressRoutes } from './routes/address.routes';
import { EmployeeRoutes } from './modules/employee/routes/employee.routes';
import { AuthRoutes } from './modules/auth/routes/auth.routes';

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    router.use('/api/auth', AuthRoutes.routes);
    router.use('/api/user', UserRoutes.routes);
    router.use('/api/address', AddressRoutes.routes);
    router.use('/api/employee', EmployeeRoutes.routes);

    return router;
  }
}
