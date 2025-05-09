import { App } from "./server";


(async () => {
  const app = new App();

  await app.init();
})();