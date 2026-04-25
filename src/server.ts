import { Application } from 'express';
import { logger } from './shared/logger';

export class Server {
  public readonly app: Application;
  private readonly logger = logger;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Inicia el servidor en el puerto especificado
   * @param port - Puerto en el que escuchará el servidor
   */
  public listen(port: number): void {
    this.app.listen(port, () => {
      this.logger.info(`=========== Server running on port ${port} ==========`);
      this.logger.info(
        `=========== Environment: ${process.env.NODE_ENV || 'development'} ==========`,
      );
    });
  }

  /**
   * Cierra el servidor (útil para testing y shutdown graceful)
   */
  public close(): void {
    this.logger.info('Server closing...');
  }
}
