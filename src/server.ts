import express, { Application, Router } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { corsConfig } from './config/cors.config';
import { postSQLConnection } from './db/postgresql.config';
import { DataSource } from 'typeorm';
import { exit } from 'node:process';

interface IApp {
  port: number | string;
  routes: Router;
}
export default class App {
  public readonly app: Application;
  public port: number | string;
  private readonly routes: Router;
  constructor(options: IApp) {
    const { port,routes } = options;
    this.app = express();
    this.port = Number(port) || 3000;
    this.routes = routes;
    this.initializeMiddlewares();
    this.initializeRoutes();
  }
  /**
   * Connecta a la base de datos utilizando una conexión postSQL.
   * Async/await para manejar la conexión de manera asíncrona.
   */
  private async connectToDatabase(): Promise<DataSource | void> {
    try {
      return await postSQLConnection();
    } catch (error) {
      console.error('Error connecting to the database:', error);
      throw error
    }
  }

  /**
   * Método para inicializar los middlewares de la aplicación
   * Aquí se pueden agregar los middlewares de la aplicación
   */
  public initializeMiddlewares() {
    this.app.use(morgan('dev'));
    this.app.use(cors(corsConfig))
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  private initializeRoutes() {
    this.app.use('/api', this.routes );
  }
  /**
   * Inicializa el servidor y la conexión a la base de datos
   */
  public async init() {
    try {
      await this.connectToDatabase();
      this.app.listen(this.port, () => {
        console.log(`Server is running on port ${this.port}`);
      })
    } catch (error) {
      console.error('Error initializing the server:', error);
      exit(1); // Exit the process with a failure code
    }
  }
}
