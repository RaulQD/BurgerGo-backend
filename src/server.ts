
import express, { Application, Router } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import { corsConfig } from './config/cors.config';

dotenv.config();
interface Options {
  routes: Router;
}

export class Server {
  public app: Application;
  private readonly routes: Router;
  constructor(options: Options) {
    const { routes } = options;
    this.routes = routes;
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();

  }

  private initializeMiddlewares() {
    this.app.use(cors(corsConfig));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
  }
  private initializeRoutes() {
    this.app.use(this.routes);
  }
  public listen(port: number) {
    this.app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}

// const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));

// // Routes
// app.use('/api/rol', rolRouter)
// app.use('/api/user', userRouter)
// app.use('/api/auth', authRouter)
// // app.use(errorHandler)

// export default app;