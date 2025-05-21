import { AppDataBaseSources } from "./config/data.sources";
import app from "./server";

const PORT = process.env.PORT || 3000;

AppDataBaseSources.initialize().then(() => {
  console.log(`=========== Postgres DB Connected ==========`)
  console.log(`=========== DB Port: ${process.env.DB_PORT} =========`);
  console.log(`=========== DB Name: ${process.env.DB_NAME} =========`);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Error during Data Source initialization:', error);
});