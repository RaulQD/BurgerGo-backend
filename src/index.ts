import { AppRoutes } from "./routes";
import App from "./server";


(async () => {
  const app = new App({ port: Number(process.env.PORT), routes: AppRoutes.routes });

  await app.init();
})();