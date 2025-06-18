
import express, { Application, Router } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { corsConfig } from './config/cors.config';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';

dotenv.config();
interface Options {
  routes: Router;
}

export class Server {
  public app: Application;
  private readonly routes: Router;
  private logger = logger;
  constructor(options: Options) {
    const { routes } = options;
    this.routes = routes;
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandler();
  }

  private initializeMiddlewares() {
    this.app.use(cors(corsConfig));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
    this.app.use(cookieParser())
  }
  private initializeRoutes() {
    this.app.use(this.routes);
  }
  private initializeErrorHandler() { 
    this.app.use(errorHandler);
  }
  public listen(port: number) {
    this.app.listen(port, () => {
      this.logger.info(`Server is running on port ${port}`);
    });
  }
}
