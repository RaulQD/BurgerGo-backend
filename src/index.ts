import 'reflect-metadata';
import { createApp } from './app';
import { logger } from './shared/logger';
import { composeAuthController } from './presentation/http/composition/auth.composition';
import { Server } from './server';
import { AppDataBaseSources } from './infrastructure/database/typeorm/config/data-source';
import { composeCustomerController } from './presentation/http/composition/customer.composition';
import {
  AddressRoutes,
  AuthRoutes,
  CustomerRoutes,
} from './presentation/http/routes';
import { composeAddressController } from './presentation/http/composition/address.composition';
import { envConfig } from './infrastructure/config/env.config';

const PORT = envConfig.app.port || 3000;

/**
 * Función principal que inicia la aplicación
 * Sigue el patrón de Clean Architecture
 */
async function main(): Promise<void> {
  try {
    //Inicializar base de datos
    await AppDataBaseSources.initialize();
    logger.info(`=========== DB Connected ==========`);
    logger.info(`=========== DB Port: ${envConfig.database.port} ==========`);
    logger.info(`=========== DB Name: ${envConfig.database.name} ==========`);

    // Compose Controllers (Dependency Injection - Clean Architecture)
    const { authController, verifyAccessToken } =
      composeAuthController(AppDataBaseSources);

    const { customerController } =
      composeCustomerController(AppDataBaseSources);
    const { addressController } = composeAddressController(AppDataBaseSources);

    // crear Routers
    const authRouter = AuthRoutes(authController);
    const customerRouter = CustomerRoutes(
      customerController,
      verifyAccessToken,
    );
    const addressRouter = AddressRoutes(addressController, verifyAccessToken);
    //  Crear aplicación Express con configuración
    const app = createApp({
      authRouter,
      customerRouter,
      addressRouter,
    });

    //  Crear servidor y arrancar
    const server = new Server(app);
    server.listen(Number(PORT));
  } catch (error) {
    console.error(error);
    logger.error(error, ' Error during application initialization:');
    process.exit(1);
  }
}
// Ejecutar aplicación
(async () => {
  await main();
})();
