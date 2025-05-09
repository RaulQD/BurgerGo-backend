import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { corsConfig } from './config/cors.config';

export class App {
  public app: express.Application;
  public port: number;
  constructor() {
    this.app = express();
    this.port = Number(process.env.PORT) || 3000;
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  public initializeMiddlewares() {
    this.app.use(morgan('dev'));
    this.app.use(cors(corsConfig))
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    

  }
  public initializeRoutes() {

  }

  public init() {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    })
  }
  private connectToDatabase() { 
    //TODO inicializar la conexion a la base de datos
  }
}