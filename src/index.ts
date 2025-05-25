import { AppDataBaseSources } from "./config/data.sources";
import { AppRoutes } from "./routes";
import { Server } from "./server";

const PORT = process.env.PORT || 3000;

(async () => {
  main();
})();

async function main() {
  const server = new Server({ routes: AppRoutes.routes });
  await AppDataBaseSources.initialize().then(() => {
    console.log(`=========== Postgres DB Connected ==========`);
    console.log(`=========== DB Port: ${process.env.DB_PORT} =========`);
    console.log(`=========== DB Name: ${process.env.DB_NAME} =========`);
    server.listen(Number(PORT));
  }).catch((error) => {
    console.error('Error during Data Source initialization:', error);
  });
}

// AppDataBaseSources.initialize().then(() => {
//   console.log(`=========== Postgres DB Connected ==========`)
//   console.log(`=========== DB Port: ${process.env.DB_PORT} =========`);
//   console.log(`=========== DB Name: ${process.env.DB_NAME} =========`);
//   app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
//   });
// }).catch((error) => {
//   console.error('Error during Data Source initialization:', error);
// });