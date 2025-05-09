import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { corsConfig } from './config/cors.config';
import { postSQLConnection } from './db/postgresql.config';
import { DataSource } from 'typeorm';
import { exit } from 'node:process';
import { UserRoutes } from './routes/user.routes';

export class App {
  public app: express.Application;
  public port: number;
  constructor() {
    this.app = express();
    this.port = Number(process.env.PORT) || 3000;
    this.initializeMiddlewares();
    this.initializeRoutes();
  }
  /**
   * Connecta a la base de datos utilizando una conexión postSQL.
   */
  private async connectToDatabase(): Promise<DataSource | void> {
    await postSQLConnection();
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
  /**
   * Método para inicializar las rutas de la aplicación
   * Aquí se pueden agregar las rutas de los controladores
   */
  public initializeRoutes() {
    this.app.use('/api/user', UserRoutes.routes())
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