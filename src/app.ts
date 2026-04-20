import { Router } from 'express';
import express, { Express } from 'express';
import morgan from 'morgan';
import { errorHandler } from './presentation/http/middlewares/errors/error-handler.middleware';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsConfig } from './presentation/http/config/cors.config';

interface AppConfig {
  authRouter: Router;
  customerRouter: Router;
  addressRouter: Router;
}

export const createApp = (config: AppConfig): Express => {
  const app = express();

  app.use(cors(corsConfig));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api/auth', config.authRouter);
  app.use('/api/customer', config.customerRouter);
  app.use('/api/address', config.addressRouter);

  app.use(errorHandler);
  return app;
};
