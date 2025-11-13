import 'reflect-metadata';
import dotenv from 'dotenv';
import { createApp } from './app';
import { logger } from './utils/logger';
import { composeAuthController } from './presentation/http/composition/auth.composition';
import { AuthRoutes } from './presentation/http/routes/auth.routes';
import { Server } from './serverV2';
import { AppDataBaseSources } from './infrastructure/database/typeorm/config/data-source';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Función principal que inicia la aplicación
 * Sigue el patrón de Clean Architecture
 */
async function main(): Promise<void> {
  try {
    // 1️⃣ Inicializar base de datos
    await AppDataBaseSources.initialize();
    logger.info(`=========== DB Connected ==========`);
    logger.info(`=========== DB Port: ${process.env.DB_PORT} ==========`);
    logger.info(`=========== DB Name: ${process.env.DB_NAME} ==========`);

    // 2️⃣ Compose Controllers (Dependency Injection - Clean Architecture)
    const { authController, tokenService } =
      composeAuthController(AppDataBaseSources);

    // 3️⃣ Crear Routers
    const authRouter = AuthRoutes(authController, tokenService);

    // 4️⃣ Crear aplicación Express con configuración
    const app = createApp({
      authRouter,
      // Aquí agregarás más routers conforme migres:
      // productRouter: ProductRoutes(productController),
      // orderRouter: OrderRoutes(orderController),
    });

    // 5️⃣ Crear servidor y arrancar
    const server = new Server(app);
    server.listen(Number(PORT));
  } catch (error) {
    logger.error(' Error during application initialization:', error);
    process.exit(1);
  }
}

// Ejecutar aplicación
(async () => {
  await main();
})();
