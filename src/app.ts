import { Router } from 'express';
import express, { Express } from 'express';
import morgan from 'morgan';
import { errorHandler } from './presentation/http/middlewares/errors/error-handler.middleware';
import cors from 'cors';
import { corsConfig } from './config/cors.config';
import cookieParser from 'cookie-parser';

interface AppConfig {
  authRouter: Router;
}

export const createApp = (config: AppConfig): Express => {
  const app = express();

  app.use(cors(corsConfig));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api/auth', config.authRouter);

  app.use(errorHandler);
  return app;
};
