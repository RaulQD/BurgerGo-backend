import { AppDataBaseSources } from "./config/data.sources";
import { AppRoutes } from "./routes";
import { Server } from "./server";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 3000;

(async () => {
  main();
})();

async function main() {
  const server = new Server({ routes: AppRoutes.routes });
  await AppDataBaseSources.initialize().then(() => {
    logger.info(`=========== DB Connected ==========`);
    logger.info(`=========== DB Port: ${process.env.DB_PORT} =========`);
    logger.info(`=========== DB Name: ${process.env.DB_NAME} =========`);
    server.listen(Number(PORT));
  }).catch((error) => {
    console.log(error)
    logger.error('Error during Data Source initialization:', error);
  });
}
